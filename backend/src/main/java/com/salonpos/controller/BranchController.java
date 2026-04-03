package com.salonpos.controller;

import com.salonpos.dto.BranchResponse;
import com.salonpos.dto.CreateBranchRequest;
import com.salonpos.dto.UpdateBranchRequest;
import com.salonpos.service.BranchService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    private final BranchService branchService;

    public BranchController(BranchService branchService) {
        this.branchService = branchService;
    }

    @GetMapping
    public List<BranchResponse> list() {
        return branchService.list();
    }

    @PostMapping
    public BranchResponse create(@Valid @RequestBody CreateBranchRequest request) {
        return branchService.create(request);
    }

    @PatchMapping("/{branchId}")
    public BranchResponse update(@PathVariable Long branchId, @Valid @RequestBody UpdateBranchRequest request) {
        return branchService.update(branchId, request);
    }
}
