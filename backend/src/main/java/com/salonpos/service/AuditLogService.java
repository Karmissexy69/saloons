package com.salonpos.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salonpos.domain.AppUser;
import com.salonpos.domain.AuditLog;
import com.salonpos.repository.AppUserRepository;
import com.salonpos.repository.AuditLogRepository;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AppUserRepository appUserRepository;
    private final ObjectMapper objectMapper;

    public AuditLogService(
        AuditLogRepository auditLogRepository,
        AppUserRepository appUserRepository,
        ObjectMapper objectMapper
    ) {
        this.auditLogRepository = auditLogRepository;
        this.appUserRepository = appUserRepository;
        this.objectMapper = objectMapper;
    }

    public void log(String action, String entityType, Long entityId, Object before, Object after) {
        AuditLog auditLog = new AuditLog();
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setBeforeJson(asJson(before));
        auditLog.setAfterJson(asJson(after));
        auditLog.setCreatedAt(OffsetDateTime.now());
        resolveActor().ifPresent(auditLog::setActorUser);
        auditLogRepository.save(auditLog);
    }

    private Optional<AppUser> resolveActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            return Optional.empty();
        }

        String username = authentication.getName();
        if ("anonymousUser".equalsIgnoreCase(username)) {
            return Optional.empty();
        }

        return appUserRepository.findByUsername(username);
    }

    private String asJson(Object payload) {
        if (payload == null) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            return "{\"serializationError\":true}";
        }
    }
}
