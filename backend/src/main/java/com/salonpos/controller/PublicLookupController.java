package com.salonpos.controller;

import com.salonpos.dto.PublicBranchResponse;
import com.salonpos.dto.PublicServiceResponse;
import com.salonpos.dto.PublicStaffResponse;
import com.salonpos.service.BranchService;
import com.salonpos.service.ServiceCatalogService;
import com.salonpos.service.StaffService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicLookupController {

    private final BranchService branchService;
    private final ServiceCatalogService serviceCatalogService;
    private final StaffService staffService;

    public PublicLookupController(
        BranchService branchService,
        ServiceCatalogService serviceCatalogService,
        StaffService staffService
    ) {
        this.branchService = branchService;
        this.serviceCatalogService = serviceCatalogService;
        this.staffService = staffService;
    }

    @GetMapping("/branches")
    public List<PublicBranchResponse> branches() {
        return branchService.listPublic();
    }

    @GetMapping("/services")
    public List<PublicServiceResponse> services() {
        return serviceCatalogService.getPublicServices();
    }

    @GetMapping("/staff")
    public List<PublicStaffResponse> staff() {
        return staffService.listPublic();
    }
}
