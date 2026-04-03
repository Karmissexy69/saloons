package com.salonpos.config;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.rate-limit")
public class RateLimitProperties {

    private boolean enabled = true;
    private boolean trustForwardHeaders = false;
    private String rejectionMessage = "Too many requests. Please try again later.";
    private Duration idleEviction = Duration.ofHours(24);
    private Map<String, Policy> policies = new HashMap<>();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isTrustForwardHeaders() {
        return trustForwardHeaders;
    }

    public void setTrustForwardHeaders(boolean trustForwardHeaders) {
        this.trustForwardHeaders = trustForwardHeaders;
    }

    public String getRejectionMessage() {
        return rejectionMessage;
    }

    public void setRejectionMessage(String rejectionMessage) {
        this.rejectionMessage = rejectionMessage;
    }

    public Duration getIdleEviction() {
        return idleEviction;
    }

    public void setIdleEviction(Duration idleEviction) {
        this.idleEviction = idleEviction;
    }

    public Map<String, Policy> getPolicies() {
        return policies;
    }

    public void setPolicies(Map<String, Policy> policies) {
        this.policies = policies;
    }

    public static class Policy {

        private boolean enabled = true;
        private String rejectionMessage;
        private List<Limit> limits = new ArrayList<>();

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getRejectionMessage() {
            return rejectionMessage;
        }

        public void setRejectionMessage(String rejectionMessage) {
            this.rejectionMessage = rejectionMessage;
        }

        public List<Limit> getLimits() {
            return limits;
        }

        public void setLimits(List<Limit> limits) {
            this.limits = limits;
        }
    }

    public static class Limit {

        private long capacity = 1;
        private long refillTokens = 1;
        private Duration refillPeriod = Duration.ofMinutes(1);

        public long getCapacity() {
            return capacity;
        }

        public void setCapacity(long capacity) {
            this.capacity = capacity;
        }

        public long getRefillTokens() {
            return refillTokens;
        }

        public void setRefillTokens(long refillTokens) {
            this.refillTokens = refillTokens;
        }

        public Duration getRefillPeriod() {
            return refillPeriod;
        }

        public void setRefillPeriod(Duration refillPeriod) {
            this.refillPeriod = refillPeriod;
        }
    }
}
