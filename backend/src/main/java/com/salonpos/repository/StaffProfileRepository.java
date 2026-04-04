package com.salonpos.repository;

import com.salonpos.domain.StaffProfile;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffProfileRepository extends JpaRepository<StaffProfile, Long> {

    List<StaffProfile> findAllByActiveTrueOrderByDisplayNameAsc();
}
