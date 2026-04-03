package com.salonpos.ratelimit;

import com.salonpos.config.RateLimitProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class ClientIpResolver {

    private final RateLimitProperties rateLimitProperties;

    public ClientIpResolver(RateLimitProperties rateLimitProperties) {
        this.rateLimitProperties = rateLimitProperties;
    }

    public String resolve(HttpServletRequest request) {
        if (rateLimitProperties.isTrustForwardHeaders()) {
            String forwardedFor = firstToken(request.getHeader("X-Forwarded-For"));
            if (!forwardedFor.isBlank()) {
                return normalize(forwardedFor);
            }

            String realIp = normalize(request.getHeader("X-Real-IP"));
            if (!realIp.isBlank()) {
                return realIp;
            }
        }

        return normalize(request.getRemoteAddr());
    }

    private String firstToken(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        int commaIndex = value.indexOf(',');
        return commaIndex >= 0 ? value.substring(0, commaIndex).trim() : value.trim();
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.trim();
    }
}
