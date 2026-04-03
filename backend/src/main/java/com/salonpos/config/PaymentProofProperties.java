package com.salonpos.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.payment-proof")
public class PaymentProofProperties {

    @NotBlank
    private String s3Bucket = "salonpos-private";

    @NotBlank
    private String keyPrefix = "payment-proofs";
}
