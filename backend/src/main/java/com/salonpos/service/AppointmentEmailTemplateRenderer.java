package com.salonpos.service;

import com.salonpos.domain.Appointment;
import com.salonpos.domain.Customer;
import com.salonpos.domain.ServiceItem;
import com.salonpos.domain.StaffProfile;
import com.salonpos.service.BranchService;
import org.springframework.stereotype.Service;

@Service
public class AppointmentEmailTemplateRenderer {

    private final AppSettingService appSettingService;
    private final BranchService branchService;

    public AppointmentEmailTemplateRenderer(AppSettingService appSettingService, BranchService branchService) {
        this.appSettingService = appSettingService;
        this.branchService = branchService;
    }

    public String renderBookingConfirmation(Appointment appointment) {
        return render("Appointment Confirmed", "Your appointment has been booked successfully.", appointment);
    }

    public String renderReminder(Appointment appointment) {
        return render("Appointment Reminder", "This is a reminder for your upcoming appointment.", appointment);
    }

    private String render(String heading, String subtitle, Appointment appointment) {
        Customer customer = appointment.getCustomer();
        ServiceItem service = appointment.getService();
        StaffProfile staff = appointment.getStaff();
        String businessName = appSettingService.getString(AppSettingService.RECEIPT_BUSINESS_NAME_KEY, AppSettingService.DEFAULT_RECEIPT_BUSINESS_NAME);
        var branch = branchService.requireBranch(appointment.getBranchId());
        String customerName = customer != null ? customer.getName() : appointment.getGuestName();
        String email = customer != null ? customer.getEmail() : appointment.getGuestEmail();

        return """
            <html>
              <body style="margin:0;padding:0;background:#f5efe9;font-family:Segoe UI,Arial,sans-serif;color:#2f1f14;">
                <div style="max-width:620px;margin:24px auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(47,31,20,0.08);">
                  <div style="padding:28px 32px;background:linear-gradient(135deg,#442818 0%%,#8a5836 100%%);color:#fff7f0;">
                    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.78;">%s</p>
                    <h1 style="margin:0;font-size:28px;line-height:1.2;">%s</h1>
                    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;opacity:0.92;">%s</p>
                  </div>
                  <div style="padding:28px 32px;">
                    <p style="margin:0 0 20px;font-size:15px;">Hello %s,</p>
                    <table style="width:100%%;border-collapse:collapse;background:#fbf6f1;border-radius:14px;overflow:hidden;">
                      <tr><td style="padding:14px 18px;color:#7d604d;width:35%%;">Booking Reference</td><td style="padding:14px 18px;font-weight:600;">%s</td></tr>
                      <tr><td style="padding:14px 18px;color:#7d604d;">Date & Time</td><td style="padding:14px 18px;font-weight:600;">%s</td></tr>
                      <tr><td style="padding:14px 18px;color:#7d604d;">Branch</td><td style="padding:14px 18px;font-weight:600;">%s</td></tr>
                      <tr><td style="padding:14px 18px;color:#7d604d;">Service</td><td style="padding:14px 18px;font-weight:600;">%s</td></tr>
                      <tr><td style="padding:14px 18px;color:#7d604d;">Staff</td><td style="padding:14px 18px;font-weight:600;">%s</td></tr>
                      <tr><td style="padding:14px 18px;color:#7d604d;">Email</td><td style="padding:14px 18px;font-weight:600;">%s</td></tr>
                    </table>
                    <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#5f4839;">%s</p>
                  </div>
                </div>
              </body>
            </html>
            """.formatted(
            businessName,
            heading,
            subtitle,
            customerName == null || customerName.isBlank() ? "Customer" : customerName,
            appointment.getBookingReference(),
            appointment.getStartAt(),
            branch.getName(),
            service == null ? "General Service" : service.getName(),
            staff == null ? "Unassigned" : staff.getDisplayName(),
            email == null ? "-" : email,
            branch.getAddress() == null || branch.getAddress().isBlank() ? "" : branch.getAddress()
        );
    }
}
