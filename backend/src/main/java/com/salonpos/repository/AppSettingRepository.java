package com.salonpos.repository;

import com.salonpos.domain.AppSetting;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {

    List<AppSetting> findAllByOrderBySettingKeyAsc();
}
