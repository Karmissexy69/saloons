package com.salonpos.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.biometric")
public class BiometricProperties {

    @NotBlank
    private String awsRegion = "ap-southeast-1";

    private String awsAccessKeyId = "";

    private String awsSecretAccessKey = "";

    @NotBlank
    private String rekognitionCollectionId = "salonpos-staff-faces";

    @NotBlank
    private String s3BiometricBucket = "salonpos-biometric-private";

    @NotNull
    private BigDecimal faceMatchThreshold = BigDecimal.valueOf(80);

    @Min(1)
    @Max(60)
    private int verificationTokenTtlMinutes = 10;

    @Min(1)
    @Max(28)
    private int probePurgeDayOfMonth = 7;
}
