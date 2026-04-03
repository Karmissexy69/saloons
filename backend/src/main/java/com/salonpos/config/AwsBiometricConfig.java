package com.salonpos.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
@EnableConfigurationProperties(BiometricProperties.class)
public class AwsBiometricConfig {

    @Bean
    S3Client s3Client(BiometricProperties biometricProperties) {
        return S3Client.builder()
            .region(Region.of(biometricProperties.getAwsRegion()))
            .credentialsProvider(credentialsProvider(biometricProperties))
            .build();
    }

    @Bean
    RekognitionClient rekognitionClient(BiometricProperties biometricProperties) {
        return RekognitionClient.builder()
            .region(Region.of(biometricProperties.getAwsRegion()))
            .credentialsProvider(credentialsProvider(biometricProperties))
            .build();
    }

    private AwsCredentialsProvider credentialsProvider(BiometricProperties biometricProperties) {
        String accessKeyId = trimToEmpty(biometricProperties.getAwsAccessKeyId());
        String secretAccessKey = trimToEmpty(biometricProperties.getAwsSecretAccessKey());

        if (!accessKeyId.isEmpty() && !secretAccessKey.isEmpty()) {
            return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKeyId, secretAccessKey));
        }
        return DefaultCredentialsProvider.create();
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
