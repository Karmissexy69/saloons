package com.salonpos.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ReceiptNumberGenerator {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.BASIC_ISO_DATE;
    private static final int SUFFIX_LENGTH = 12;

    public String next(Long branchId) {
        // Keep the branch/date prefix readable, but use a high-entropy suffix to avoid collisions.
        String suffix = UUID.randomUUID()
            .toString()
            .replace("-", "")
            .substring(0, SUFFIX_LENGTH)
            .toUpperCase(Locale.ROOT);
        return "B" + branchId + "-" + LocalDate.now().format(DATE_FORMATTER) + "-" + suffix;
    }
}
