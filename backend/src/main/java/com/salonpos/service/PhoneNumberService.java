package com.salonpos.service;

import org.springframework.stereotype.Service;

@Service
public class PhoneNumberService {

    public String normalize(String phone) {
        if (phone == null) {
            return "";
        }
        String trimmed = phone.trim();
        if (trimmed.isEmpty()) {
            return "";
        }

        StringBuilder normalized = new StringBuilder();
        for (int i = 0; i < trimmed.length(); i++) {
            char ch = trimmed.charAt(i);
            if (Character.isDigit(ch)) {
                normalized.append(ch);
            } else if (ch == '+' && normalized.isEmpty()) {
                normalized.append(ch);
            }
        }
        return normalized.toString();
    }
}
