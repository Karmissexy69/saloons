package com.salonpos.auth;

import com.salonpos.domain.AppUser;
import com.salonpos.domain.Role;
import com.salonpos.repository.AppUserRepository;
import com.salonpos.repository.RoleRepository;
import java.time.OffsetDateTime;
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
    private static final String ROLE_ATTENDANCE_TERMINAL = "ATTENDANCE_TERMINAL";

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.attendance-terminal.enabled:true}")
    private boolean enabled;

    @Value("${app.attendance-terminal.username:attendance_terminal}")
    private String username;

    @Value("${app.attendance-terminal.password:}")
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
            log.info("Attendance terminal bootstrap disabled.");
            return;
        }

        String normalizedUsername = normalize(username);
        if (normalizedUsername.isBlank()) {
            log.warn("Attendance terminal bootstrap skipped: username is blank.");
            return;
        }

        if (password == null || password.isBlank()) {
            log.warn("Attendance terminal bootstrap skipped: app.attendance-terminal.password is empty.");
            return;
        }

        Role terminalRole = roleRepository.findByName(ROLE_ATTENDANCE_TERMINAL)
            .orElseGet(() -> {
                Role role = new Role();
                role.setName(ROLE_ATTENDANCE_TERMINAL);
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
            log.info("Attendance terminal user '{}' is ready.", normalizedUsername);
        } else {
            log.info("Attendance terminal user '{}' already up to date.", normalizedUsername);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
