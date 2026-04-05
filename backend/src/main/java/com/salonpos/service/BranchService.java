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
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BranchService {

    private static final LocalTime DEFAULT_OPENING_TIME = LocalTime.of(8, 0);
    private static final LocalTime DEFAULT_CLOSING_TIME = LocalTime.of(20, 0);

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
            .map(branch -> new PublicBranchResponse(
                branch.getId(),
                branch.getName(),
                branch.getAddress(),
                formatTime(branch.getOpeningTime(), DEFAULT_OPENING_TIME),
                formatTime(branch.getClosingTime(), DEFAULT_CLOSING_TIME)
            ))
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
        branch.setOpeningTime(resolveOpeningTime(request.openingTime(), null));
        branch.setClosingTime(resolveClosingTime(request.closingTime(), null));
        validateScheduleWindow(branch.getOpeningTime(), branch.getClosingTime());
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
        branch.setOpeningTime(resolveOpeningTime(request.openingTime(), branch.getOpeningTime()));
        branch.setClosingTime(resolveClosingTime(request.closingTime(), branch.getClosingTime()));
        validateScheduleWindow(branch.getOpeningTime(), branch.getClosingTime());

        Branch saved = branchRepository.save(branch);
        BranchResponse response = toResponse(saved);
        auditLogService.log("BRANCH_UPDATED", "branch", saved.getId(), before, response);
        return response;
    }

    private BranchResponse toResponse(Branch branch) {
        return new BranchResponse(
            branch.getId(),
            branch.getName(),
            branch.getAddress(),
            branch.isActive(),
            formatTime(branch.getOpeningTime(), DEFAULT_OPENING_TIME),
            formatTime(branch.getClosingTime(), DEFAULT_CLOSING_TIME)
        );
    }

    private String normalizeAddress(String rawAddress) {
        if (rawAddress == null) {
            return null;
        }
        String normalized = rawAddress.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private LocalTime resolveOpeningTime(String rawValue, LocalTime fallback) {
        return parseTime(rawValue, fallback == null ? DEFAULT_OPENING_TIME : fallback, "openingTime");
    }

    private LocalTime resolveClosingTime(String rawValue, LocalTime fallback) {
        return parseTime(rawValue, fallback == null ? DEFAULT_CLOSING_TIME : fallback, "closingTime");
    }

    private LocalTime parseTime(String rawValue, LocalTime fallback, String fieldName) {
        if (rawValue == null || rawValue.isBlank()) {
            return fallback;
        }
        try {
            return LocalTime.parse(rawValue.trim());
        } catch (DateTimeParseException ex) {
            throw new BadRequestException(fieldName + " must use HH:mm format.");
        }
    }

    private void validateScheduleWindow(LocalTime openingTime, LocalTime closingTime) {
        if (!closingTime.isAfter(openingTime)) {
            throw new BadRequestException("closingTime must be after openingTime.");
        }
    }

    private String formatTime(LocalTime value, LocalTime fallback) {
        LocalTime safe = value == null ? fallback : value;
        return "%02d:%02d".formatted(safe.getHour(), safe.getMinute());
    }
}
