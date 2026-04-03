package com.salonpos.controller;

import com.salonpos.dto.CreateServiceRequest;
import com.salonpos.dto.ServiceItemResponse;
import jakarta.validation.Valid;
import com.salonpos.service.ServiceCatalogService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/services")
public class ServiceController {

    private final ServiceCatalogService serviceCatalogService;

    public ServiceController(ServiceCatalogService serviceCatalogService) {
        this.serviceCatalogService = serviceCatalogService;
    }

    @GetMapping
    public List<ServiceItemResponse> list() {
        return serviceCatalogService.getActiveServices();
    }

    @PostMapping
    public ServiceItemResponse create(@Valid @RequestBody CreateServiceRequest request) {
        return serviceCatalogService.createService(request);
    }
}
