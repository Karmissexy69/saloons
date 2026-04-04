package com.salonpos.service;

import com.salonpos.exception.BadRequestException;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class EmailAddressService {

    public String normalize(String email) {
        String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank() || !looksLikeEmail(normalized)) {
            throw new BadRequestException("Valid email is required.");
        }
        return normalized;
    }

    public String normalizeOptional(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return normalize(email);
    }

    private boolean looksLikeEmail(String email) {
        int at = email.indexOf('@');
        return at > 0 && at < email.length() - 1 && email.indexOf('@', at + 1) < 0;
    }
}
