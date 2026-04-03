package com.salonpos.ratelimit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salonpos.config.RateLimitProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String JSON_BODY_ATTRIBUTE = RateLimitFilter.class.getName() + ".jsonBody";
    private static final Pattern STAFF_REENROLL_PATTERN = Pattern.compile("^/api/staff/(\\d+)/face/re-enroll$");
    private static final Pattern APPOINTMENT_CONVERT_PATTERN = Pattern.compile("^/api/appointments/(\\d+)/convert-to-bill$");

    private final RateLimitProperties rateLimitProperties;
    private final RateLimitBucketService rateLimitBucketService;
    private final ClientIpResolver clientIpResolver;
    private final ObjectMapper objectMapper;

    public RateLimitFilter(
        RateLimitProperties rateLimitProperties,
        RateLimitBucketService rateLimitBucketService,
        ClientIpResolver clientIpResolver,
        ObjectMapper objectMapper
    ) {
        this.rateLimitProperties = rateLimitProperties;
        this.rateLimitBucketService = rateLimitBucketService;
        this.clientIpResolver = clientIpResolver;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        if (!rateLimitProperties.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        HttpServletRequest workingRequest = shouldCacheBody(request) ? new CachedBodyHttpServletRequest(request) : request;
        List<ResolvedCheck> checks = resolveChecks(workingRequest);
        for (ResolvedCheck check : checks) {
            ConsumptionResult result = tryConsume(check);
            if (result.denied()) {
                writeRateLimitedResponse(response, check.policyName(), result.probe());
                return;
            }
        }

        filterChain.doFilter(workingRequest, response);
    }

    private boolean shouldCacheBody(HttpServletRequest request) {
        if (!(HttpMethod.POST.matches(request.getMethod()) || HttpMethod.PUT.matches(request.getMethod()) || HttpMethod.PATCH.matches(request.getMethod()))) {
            return false;
        }
        String contentType = request.getContentType();
        return contentType != null && contentType.toLowerCase().contains(MediaType.APPLICATION_JSON_VALUE);
    }

    private List<ResolvedCheck> resolveChecks(HttpServletRequest request) {
        String path = request.getServletPath();
        String method = request.getMethod();
        String clientIp = clientIpResolver.resolve(request);
        List<ResolvedCheck> checks = new ArrayList<>();

        if (HttpMethod.POST.matches(method) && "/api/auth/login".equals(path)) {
            checks.add(new ResolvedCheck(RateLimitPolicyNames.LOGIN_IP, "ip:" + clientIp));

            String username = textValue(jsonBody(request), "username");
            if (!username.isBlank()) {
                checks.add(new ResolvedCheck(RateLimitPolicyNames.LOGIN_USERNAME, "username:" + username.toLowerCase()));
            }
            return checks;
        }

        if (HttpMethod.POST.matches(method) && "/api/attendance/verify-face".equals(path)) {
            checks.add(new ResolvedCheck(RateLimitPolicyNames.ATTENDANCE_VERIFY_FACE_IP, "ip:" + clientIp));

            Long staffId = parseLong(request.getParameter("staffId"));
            if (staffId != null) {
                checks.add(new ResolvedCheck(RateLimitPolicyNames.ATTENDANCE_VERIFY_FACE_STAFF, "staff:" + staffId));
            }
            return checks;
        }

        if (
            HttpMethod.POST.matches(method)
                && ("/api/attendance/clock-in".equals(path)
                || "/api/attendance/clock-out".equals(path)
                || "/api/attendance/break-start".equals(path)
                || "/api/attendance/break-end".equals(path))
        ) {
            Long staffId = longValue(jsonBody(request), "staffId");
            if (staffId != null) {
                checks.add(new ResolvedCheck(RateLimitPolicyNames.ATTENDANCE_ACTION_STAFF, "staff:" + staffId + ":path:" + path));
            }
            return checks;
        }

        if (HttpMethod.POST.matches(method) && "/api/staff".equals(path)) {
            String username = authenticatedUsername();
            if (!username.isBlank()) {
                checks.add(new ResolvedCheck(RateLimitPolicyNames.STAFF_ENROLL_USER, "user:" + username.toLowerCase()));
            }
            return checks;
        }

        if (HttpMethod.POST.matches(method)) {
            Matcher reEnrollMatcher = STAFF_REENROLL_PATTERN.matcher(path);
            if (reEnrollMatcher.matches()) {
                String username = authenticatedUsername();
                if (!username.isBlank()) {
                    checks.add(new ResolvedCheck(RateLimitPolicyNames.STAFF_REENROLL_USER, "user:" + username.toLowerCase()));
                }
                checks.add(new ResolvedCheck(RateLimitPolicyNames.STAFF_REENROLL_TARGET, "staff:" + reEnrollMatcher.group(1)));
                return checks;
            }
        }

        if (HttpMethod.POST.matches(method) && "/api/transactions".equals(path)) {
            Long branchId = longValue(jsonBody(request), "branchId");
            String identity = branchId == null ? "ip:" + clientIp : "branch:" + branchId + ":ip:" + clientIp;
            checks.add(new ResolvedCheck(RateLimitPolicyNames.TRANSACTIONS_CREATE, identity));
            return checks;
        }

        if (HttpMethod.POST.matches(method)) {
            Matcher appointmentConvertMatcher = APPOINTMENT_CONVERT_PATTERN.matcher(path);
            if (appointmentConvertMatcher.matches()) {
                String username = authenticatedUsername();
                if (!username.isBlank()) {
                    checks.add(new ResolvedCheck(RateLimitPolicyNames.APPOINTMENT_CONVERT, "user:" + username.toLowerCase()));
                }
                return checks;
            }
        }

        if (HttpMethod.POST.matches(method) && "/api/refunds".equals(path)) {
            String username = authenticatedUsername();
            if (!username.isBlank()) {
                checks.add(new ResolvedCheck(RateLimitPolicyNames.REFUNDS_CREATE, "user:" + username.toLowerCase()));
            }
            return checks;
        }

        if (HttpMethod.GET.matches(method) && "/api/receipts/history/export".equals(path)) {
            String username = authenticatedUsername();
            if (!username.isBlank()) {
                checks.add(new ResolvedCheck(RateLimitPolicyNames.RECEIPTS_EXPORT, "user:" + username.toLowerCase()));
            }
            return checks;
        }

        if (HttpMethod.GET.matches(method) && "/api/reports/sales-summary".equals(path)) {
            String username = authenticatedUsername();
            if (!username.isBlank()) {
                checks.add(new ResolvedCheck(RateLimitPolicyNames.REPORTS_SALES_SUMMARY, "user:" + username.toLowerCase()));
            }
        }

        return checks;
    }

    private ConsumptionResult tryConsume(ResolvedCheck check) {
        RateLimitProperties.Policy policy = rateLimitProperties.getPolicies().get(check.policyName());
        if (policy == null || !policy.isEnabled()) {
            return ConsumptionResult.allowed(null);
        }

        var probe = rateLimitBucketService.tryConsume(check.policyName(), check.key());
        if (probe == null || probe.isConsumed()) {
            return ConsumptionResult.allowed(probe);
        }
        return ConsumptionResult.denied(probe);
    }

    private void writeRateLimitedResponse(HttpServletResponse response, String policyName, io.github.bucket4j.ConsumptionProbe probe) throws IOException {
        RateLimitProperties.Policy policy = rateLimitProperties.getPolicies().get(policyName);
        String message = policy != null && policy.getRejectionMessage() != null && !policy.getRejectionMessage().isBlank()
            ? policy.getRejectionMessage()
            : rateLimitProperties.getRejectionMessage();

        long retryAfterSeconds = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));

        response.setStatus(429);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setHeader("X-Rate-Limit-Retry-After-Seconds", String.valueOf(retryAfterSeconds));
        response.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", OffsetDateTime.now());
        body.put("status", 429);
        body.put("error", message);
        objectMapper.writeValue(response.getWriter(), body);
    }

    private JsonNode jsonBody(HttpServletRequest request) {
        Object cached = request.getAttribute(JSON_BODY_ATTRIBUTE);
        if (cached instanceof JsonNode node) {
            return node;
        }

        JsonNode node = objectMapper.nullNode();
        if (request instanceof CachedBodyHttpServletRequest cachedRequest) {
            byte[] body = cachedRequest.getCachedBody();
            if (body.length > 0) {
                try {
                    node = objectMapper.readTree(body);
                } catch (IOException ignored) {
                    node = objectMapper.nullNode();
                }
            }
        }

        request.setAttribute(JSON_BODY_ATTRIBUTE, node);
        return node;
    }

    private String authenticatedUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "";
        }
        return authentication.getName() == null ? "" : authentication.getName().trim();
    }

    private String textValue(JsonNode node, String fieldName) {
        if (node == null || node.isNull()) {
            return "";
        }
        JsonNode value = node.get(fieldName);
        return value == null || value.isNull() ? "" : value.asText("").trim();
    }

    private Long longValue(JsonNode node, String fieldName) {
        if (node == null || node.isNull()) {
            return null;
        }
        JsonNode value = node.get(fieldName);
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.canConvertToLong()) {
            return value.longValue();
        }
        return parseLong(value.asText(null));
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private record ResolvedCheck(String policyName, String key) {
    }

    private record ConsumptionResult(boolean denied, io.github.bucket4j.ConsumptionProbe probe) {
        private static ConsumptionResult allowed(io.github.bucket4j.ConsumptionProbe probe) {
            return new ConsumptionResult(false, probe);
        }

        private static ConsumptionResult denied(io.github.bucket4j.ConsumptionProbe probe) {
            return new ConsumptionResult(true, probe);
        }
    }
}
