package com.salonpos.auth;

import com.salonpos.security.AppUserPrincipal;
import com.salonpos.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthLoginResponse login(AuthLoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        String token = jwtService.generateToken(principal.getUsername(), principal.getRole());

        return new AuthLoginResponse(
            token,
            "Bearer",
            jwtService.getExpirationSeconds(),
            principal.getUsername(),
            principal.getRole()
        );
    }
}
