package com.salonpos.controller;

import com.salonpos.dto.AppSettingResponse;
import com.salonpos.dto.UpdateAppSettingRequest;
import com.salonpos.service.AppSettingService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class SettingController {

    private final AppSettingService appSettingService;

    public SettingController(AppSettingService appSettingService) {
        this.appSettingService = appSettingService;
    }

    @GetMapping
    public List<AppSettingResponse> list() {
        return appSettingService.list();
    }

    @PutMapping("/{settingKey}")
    public AppSettingResponse update(@PathVariable String settingKey, @Valid @RequestBody UpdateAppSettingRequest request) {
        return appSettingService.upsert(settingKey, request.value());
    }
}
