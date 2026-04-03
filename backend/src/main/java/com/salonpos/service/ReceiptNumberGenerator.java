package com.salonpos.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Component;

@Component
public class ReceiptNumberGenerator {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.BASIC_ISO_DATE;

    public String next(Long branchId) {
        int suffix = ThreadLocalRandom.current().nextInt(1000, 9999);
        return "B" + branchId + "-" + LocalDate.now().format(DATE_FORMATTER) + "-" + suffix;
    }
}
