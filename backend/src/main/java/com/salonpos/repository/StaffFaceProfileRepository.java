package com.salonpos.repository;

import com.salonpos.domain.StaffFaceProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffFaceProfileRepository extends JpaRepository<StaffFaceProfile, Long> {

    Optional<StaffFaceProfile> findFirstByStaffIdAndActiveTrue(Long staffId);
}
