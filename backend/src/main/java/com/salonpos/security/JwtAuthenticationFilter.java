package com.salonpos.security;

import com.salonpos.domain.Customer;
import com.salonpos.repository.CustomerRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final AppUserDetailsService appUserDetailsService;
    private final CustomerRepository customerRepository;

    public JwtAuthenticationFilter(
        JwtService jwtService,
        AppUserDetailsService appUserDetailsService,
        CustomerRepository customerRepository
    ) {
        this.jwtService = jwtService;
        this.appUserDetailsService = appUserDetailsService;
        this.customerRepository = customerRepository;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        String subject;
        String role;
        String principalType;

        try {
            subject = jwtService.extractUsername(token);
            role = jwtService.extractRole(token);
            principalType = jwtService.extractPrincipalType(token);
        } catch (Exception ex) {
            filterChain.doFilter(request, response);
            return;
        }

        if (subject != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = resolveUserDetails(subject, role, principalType);
            if (userDetails != null && jwtService.isTokenValid(token, userDetails.getUsername())) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }

    private UserDetails resolveUserDetails(String subject, String role, String principalType) {
        if ("CUSTOMER".equalsIgnoreCase(role) || JwtService.CUSTOMER_PRINCIPAL_TYPE.equalsIgnoreCase(principalType)) {
            try {
                Long customerId = Long.parseLong(subject);
                Customer customer = customerRepository.findById(customerId).orElse(null);
                return customer == null ? null : new CustomerPrincipal(customer);
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return appUserDetailsService.loadUserByUsername(subject);
    }
}
