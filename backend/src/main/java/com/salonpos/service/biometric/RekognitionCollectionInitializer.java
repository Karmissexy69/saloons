package com.salonpos.service.biometric;

import com.salonpos.config.BiometricProperties;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.DescribeCollectionRequest;
import software.amazon.awssdk.services.rekognition.model.RekognitionException;
import software.amazon.awssdk.services.rekognition.model.ResourceNotFoundException;

@Component
public class RekognitionCollectionInitializer {

    private static final Logger log = LoggerFactory.getLogger(RekognitionCollectionInitializer.class);

    private final RekognitionClient rekognitionClient;
    private final BiometricProperties biometricProperties;

    public RekognitionCollectionInitializer(
        RekognitionClient rekognitionClient,
        BiometricProperties biometricProperties
    ) {
        this.rekognitionClient = rekognitionClient;
        this.biometricProperties = biometricProperties;
    }

    @PostConstruct
    public void ensureCollectionExists() {
        String collectionId = biometricProperties.getRekognitionCollectionId();
        try {
            rekognitionClient.describeCollection(DescribeCollectionRequest.builder()
                .collectionId(collectionId)
                .build());
            log.info("Rekognition collection '{}' is ready", collectionId);
        } catch (ResourceNotFoundException notFound) {
            try {
                rekognitionClient.createCollection(builder -> builder.collectionId(collectionId));
                log.info("Created Rekognition collection '{}'", collectionId);
            } catch (RekognitionException ex) {
                log.warn("Could not create Rekognition collection '{}': {}", collectionId, ex.getMessage());
            }
        } catch (RekognitionException ex) {
            log.warn("Could not verify Rekognition collection '{}': {}", collectionId, ex.getMessage());
        } catch (RuntimeException ex) {
            log.warn("Skipping Rekognition collection bootstrap '{}': {}", collectionId, ex.getMessage());
        }
    }
}
