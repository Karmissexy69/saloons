package com.salonpos.config;

import com.salonpos.ratelimit.RateLimitFilter;
import com.salonpos.security.AppUserDetailsService;
import com.salonpos.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        JwtAuthenticationFilter jwtAuthenticationFilter,
        RateLimitFilter rateLimitFilter,
        DaoAuthenticationProvider authenticationProvider,
        CorsConfigurationSource corsConfigurationSource
    ) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(rateLimitFilter, JwtAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/customer-auth/**").permitAll()
                .requestMatchers("/api/public/appointments/**").permitAll()
                .requestMatchers("/api/public/branches/**", "/api/public/services/**", "/api/public/staff/**").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/customer/**").hasRole("CUSTOMER")
                .requestMatchers(HttpMethod.POST, "/api/customers/*/points-adjustments").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/customers", "/api/customers/**").hasAnyRole("OWNER", "TERMINAL", "IT_ADMIN")
                .requestMatchers("/api/customers/**").hasAnyRole("TERMINAL", "IT_ADMIN")
                .requestMatchers("/api/admin/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/staff/*/face/re-enroll").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/staff").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/settings/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/settings", "/api/settings/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/branches/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/branches/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/branches", "/api/branches/**").hasAnyRole("OWNER", "TERMINAL", "IT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/staff", "/api/staff/**").hasAnyRole("OWNER", "TERMINAL", "IT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/attendance/report").hasAnyRole("OWNER", "IT_ADMIN")
                .requestMatchers("/api/reports/**").hasAnyRole("OWNER", "IT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/audit-logs", "/api/audit-logs/**").hasAnyRole("OWNER", "IT_ADMIN")
                .requestMatchers("/api/refunds/**").hasRole("IT_ADMIN")
                .requestMatchers("/api/appointments/**").hasAnyRole("OWNER", "TERMINAL", "IT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/services/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/services/**").hasAnyRole("OWNER", "TERMINAL", "IT_ADMIN")
                .requestMatchers("/api/transactions/**", "/api/receipts/**").hasAnyRole("OWNER", "TERMINAL", "IT_ADMIN")
                .requestMatchers("/api/attendance/**").hasAnyRole("TERMINAL", "IT_ADMIN")
                .requestMatchers("/api/commission/**").hasAnyRole("OWNER", "IT_ADMIN")
                .requestMatchers("/api/staff/**").hasRole("IT_ADMIN")
                .anyRequest().authenticated());

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(AppUserDetailsService appUserDetailsService) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(appUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
