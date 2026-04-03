package com.salonpos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SalonPosApplication {

    public static void main(String[] args) {
        SpringApplication.run(SalonPosApplication.class, args);
    }
}
