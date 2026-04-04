package com.salonpos.security;

import com.salonpos.domain.Customer;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class CustomerPrincipal implements UserDetails {

    private final Customer customer;

    public CustomerPrincipal(Customer customer) {
        this.customer = customer;
    }

    public Long getCustomerId() {
        return customer.getId();
    }

    public String getPhone() {
        return customer.getPhone();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"));
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return customer.getId().toString();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return !"INACTIVE".equalsIgnoreCase(customer.getStatus());
    }
}
