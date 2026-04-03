package com.salonpos.config;

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
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/staff/*/face/re-enroll").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/staff").hasAnyRole("ADMIN", "IT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/staff").hasAnyRole("OWNER", "ADMIN", "MANAGER", "CASHIER", "IT_ADMIN", "ATTENDANCE_TERMINAL")
                .requestMatchers(HttpMethod.GET, "/api/attendance/report").hasAnyRole("OWNER", "ADMIN", "MANAGER", "CASHIER", "STYLIST", "ATTENDANCE_TERMINAL", "IT_ADMIN")
                .requestMatchers("/api/reports/**").hasAnyRole("OWNER", "ADMIN", "MANAGER", "IT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/audit-logs", "/api/audit-logs/**").hasAnyRole("OWNER", "ADMIN", "MANAGER", "IT_ADMIN")
                .requestMatchers("/api/refunds/**").hasAnyRole("ADMIN", "MANAGER", "IT_ADMIN")
                .requestMatchers("/api/appointments/**").hasAnyRole("ADMIN", "MANAGER", "CASHIER", "STYLIST", "IT_ADMIN")
                .requestMatchers("/api/services/**").hasAnyRole("ADMIN", "MANAGER", "CASHIER", "IT_ADMIN")
                .requestMatchers("/api/transactions/**", "/api/receipts/**").hasAnyRole("ADMIN", "MANAGER", "CASHIER", "IT_ADMIN")
                .requestMatchers("/api/attendance/**").hasAnyRole("ADMIN", "MANAGER", "CASHIER", "STYLIST", "ATTENDANCE_TERMINAL", "IT_ADMIN")
                .requestMatchers("/api/commission/**").hasAnyRole("OWNER", "ADMIN", "MANAGER", "STYLIST", "IT_ADMIN")
                .requestMatchers("/api/staff/**").hasAnyRole("ADMIN", "MANAGER", "CASHIER", "IT_ADMIN")
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
