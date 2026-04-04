package com.salonpos.service;

import com.salonpos.domain.Branch;
import com.salonpos.dto.BranchResponse;
import com.salonpos.dto.CreateBranchRequest;
import com.salonpos.dto.PublicBranchResponse;
import com.salonpos.dto.UpdateBranchRequest;
import com.salonpos.exception.BadRequestException;
import com.salonpos.exception.NotFoundException;
import com.salonpos.repository.BranchRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BranchService {

    private final BranchRepository branchRepository;
    private final AuditLogService auditLogService;

    public BranchService(BranchRepository branchRepository, AuditLogService auditLogService) {
        this.branchRepository = branchRepository;
        this.auditLogService = auditLogService;
    }

    public List<BranchResponse> list() {
        return branchRepository.findAllByOrderByNameAsc()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public List<PublicBranchResponse> listPublic() {
        return branchRepository.findAllByActiveTrueOrderByNameAsc()
            .stream()
            .map(branch -> new PublicBranchResponse(branch.getId(), branch.getName(), branch.getAddress()))
            .toList();
    }

    public Branch requireBranch(Long branchId) {
        if (branchId == null) {
            throw new BadRequestException("branchId is required.");
        }

        return branchRepository.findById(branchId)
            .orElseThrow(() -> new NotFoundException("Branch not found: " + branchId));
    }

    @Transactional
    public BranchResponse create(CreateBranchRequest request) {
        String normalizedName = request.name().trim();
        if (branchRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new BadRequestException("Branch already exists: " + normalizedName);
        }

        Branch branch = new Branch();
        branch.setName(normalizedName);
        branch.setAddress(normalizeAddress(request.address()));
        branch.setActive(request.active() == null || request.active());
        branch.setCreatedAt(OffsetDateTime.now());

        Branch saved = branchRepository.save(branch);
        BranchResponse response = toResponse(saved);
        auditLogService.log("BRANCH_CREATED", "branch", saved.getId(), null, response);
        return response;
    }

    @Transactional
    public BranchResponse update(Long branchId, UpdateBranchRequest request) {
        Branch branch = branchRepository.findById(branchId)
            .orElseThrow(() -> new NotFoundException("Branch not found: " + branchId));

        String normalizedName = request.name().trim();
        if (branchRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, branchId)) {
            throw new BadRequestException("Branch already exists: " + normalizedName);
        }

        BranchResponse before = toResponse(branch);
        branch.setName(normalizedName);
        branch.setAddress(normalizeAddress(request.address()));
        branch.setActive(request.active() == null || request.active());

        Branch saved = branchRepository.save(branch);
        BranchResponse response = toResponse(saved);
        auditLogService.log("BRANCH_UPDATED", "branch", saved.getId(), before, response);
        return response;
    }

    private BranchResponse toResponse(Branch branch) {
        return new BranchResponse(branch.getId(), branch.getName(), branch.getAddress(), branch.isActive());
    }

    private String normalizeAddress(String rawAddress) {
        if (rawAddress == null) {
            return null;
        }
        String normalized = rawAddress.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
