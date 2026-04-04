package com.salonpos.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;

@Configuration
@EnableConfigurationProperties(NotificationProperties.class)
public class AwsNotificationConfig {

    @Bean
    SesV2Client sesV2Client(NotificationProperties notificationProperties) {
        return SesV2Client.builder()
            .region(Region.of(notificationProperties.getAwsRegion()))
            .credentialsProvider(credentialsProvider(notificationProperties))
            .build();
    }

    private AwsCredentialsProvider credentialsProvider(NotificationProperties notificationProperties) {
        String accessKeyId = trimToEmpty(notificationProperties.getAwsAccessKeyId());
        String secretAccessKey = trimToEmpty(notificationProperties.getAwsSecretAccessKey());

        if (!accessKeyId.isEmpty() && !secretAccessKey.isEmpty()) {
            return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKeyId, secretAccessKey));
        }
        return DefaultCredentialsProvider.create();
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
