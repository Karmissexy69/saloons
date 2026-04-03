package com.salonpos.repository;

import com.salonpos.domain.StaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffProfileRepository extends JpaRepository<StaffProfile, Long> {
}
