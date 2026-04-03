package com.salonpos.service.biometric;

import com.salonpos.exception.BadRequestException;
import java.io.IOException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FaceImageService {

    private static final long MAX_IMAGE_SIZE_BYTES = 5L * 1024 * 1024;

    public byte[] readImageBytes(MultipartFile imageFile, String fieldName) {
        if (imageFile == null || imageFile.isEmpty()) {
            throw new BadRequestException(fieldName + " is required.");
        }

        if (imageFile.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new BadRequestException(fieldName + " exceeds 5MB limit.");
        }

        String contentType = imageFile.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new BadRequestException(fieldName + " must be an image file.");
        }

        try {
            return imageFile.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("Unable to read " + fieldName + ".");
        }
    }
}
