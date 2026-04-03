package com.salonpos.auth;

import com.salonpos.domain.AppUser;
import com.salonpos.domain.Role;
import com.salonpos.repository.AppUserRepository;
import com.salonpos.repository.RoleRepository;
import java.time.OffsetDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AttendanceTerminalBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AttendanceTerminalBootstrap.class);
    private static final String ROLE_TERMINAL = "TERMINAL";
    private static final List<String> LEGACY_SHARED_USERNAMES = List.of("terminal", "attendance", "attendance_terminal");

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.terminal.enabled:true}")
    private boolean enabled;

    @Value("${app.terminal.username:terminal}")
    private String username;

    @Value("${app.terminal.password:}")
    private String password;

    public AttendanceTerminalBootstrap(
        AppUserRepository appUserRepository,
        RoleRepository roleRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.appUserRepository = appUserRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Shared terminal bootstrap disabled.");
            return;
        }

        String normalizedUsername = normalize(username);
        if (normalizedUsername.isBlank()) {
            log.warn("Shared terminal bootstrap skipped: username is blank.");
            return;
        }

        if (password == null || password.isBlank()) {
            log.warn("Shared terminal bootstrap skipped: app.terminal.password is empty.");
            return;
        }

        Role terminalRole = roleRepository.findByName(ROLE_TERMINAL)
            .orElseGet(() -> {
                Role role = new Role();
                role.setName(ROLE_TERMINAL);
                return roleRepository.save(role);
            });

        AppUser terminalUser = appUserRepository.findByUsername(normalizedUsername)
            .orElseGet(() -> {
                AppUser user = new AppUser();
                user.setUsername(normalizedUsername);
                user.setCreatedAt(OffsetDateTime.now());
                return user;
            });

        boolean changed = false;

        if (terminalUser.getRole() == null || !terminalRole.getId().equals(terminalUser.getRole().getId())) {
            terminalUser.setRole(terminalRole);
            changed = true;
        }

        if (!"ACTIVE".equalsIgnoreCase(terminalUser.getStatus())) {
            terminalUser.setStatus("ACTIVE");
            changed = true;
        }

        String existingHash = terminalUser.getPasswordHash();
        if (existingHash == null || existingHash.isBlank() || !passwordEncoder.matches(password, existingHash)) {
            terminalUser.setPasswordHash(passwordEncoder.encode(password));
            changed = true;
        }

        if (terminalUser.getCreatedAt() == null) {
            terminalUser.setCreatedAt(OffsetDateTime.now());
            changed = true;
        }

        if (changed) {
            appUserRepository.save(terminalUser);
            log.info("Shared terminal user '{}' is ready.", normalizedUsername);
        } else {
            log.info("Shared terminal user '{}' already up to date.", normalizedUsername);
        }

        deactivateLegacySharedUsers(normalizedUsername);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private void deactivateLegacySharedUsers(String activeUsername) {
        for (String candidate : LEGACY_SHARED_USERNAMES) {
            if (candidate.equalsIgnoreCase(activeUsername)) {
                continue;
            }

            appUserRepository.findByUsername(candidate).ifPresent(user -> {
                if (!"INACTIVE".equalsIgnoreCase(user.getStatus())) {
                    user.setStatus("INACTIVE");
                    appUserRepository.save(user);
                    log.info("Legacy shared terminal user '{}' disabled in favor of '{}'.", candidate, activeUsername);
                }
            });
        }
    }
}
