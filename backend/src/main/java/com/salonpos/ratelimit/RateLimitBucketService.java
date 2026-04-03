package com.salonpos.ratelimit;

import com.salonpos.config.RateLimitProperties;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class RateLimitBucketService {

    private final RateLimitProperties rateLimitProperties;
    private final Map<String, BucketHolder> buckets = new ConcurrentHashMap<>();

    public RateLimitBucketService(RateLimitProperties rateLimitProperties) {
        this.rateLimitProperties = rateLimitProperties;
    }

    public ConsumptionProbe tryConsume(String policyName, String key) {
        RateLimitProperties.Policy policy = rateLimitProperties.getPolicies().get(policyName);
        if (policy == null || !policy.isEnabled()) {
            return null;
        }

        String fullKey = policyName + "::" + key;
        BucketHolder holder = buckets.computeIfAbsent(fullKey, ignored -> new BucketHolder(newBucket(policy)));
        holder.touch();
        return holder.bucket().tryConsumeAndReturnRemaining(1);
    }

    @Scheduled(cron = "0 0 * * * *")
    public void cleanupIdleBuckets() {
        if (!rateLimitProperties.isEnabled()) {
            buckets.clear();
            return;
        }

        Duration idleEviction = rateLimitProperties.getIdleEviction();
        long evictionNanos = idleEviction == null ? Duration.ofHours(24).toNanos() : idleEviction.toNanos();
        long cutoff = System.nanoTime() - evictionNanos;
        buckets.entrySet().removeIf(entry -> entry.getValue().lastTouchedAtNanos() < cutoff);
    }

    private Bucket newBucket(RateLimitProperties.Policy policy) {
        var builder = Bucket.builder();
        for (RateLimitProperties.Limit limit : policy.getLimits()) {
            builder.addLimit(Bandwidth.classic(
                limit.getCapacity(),
                Refill.greedy(limit.getRefillTokens(), limit.getRefillPeriod())
            ));
        }
        return builder.build();
    }

    private static final class BucketHolder {

        private final Bucket bucket;
        private volatile long lastTouchedAtNanos;

        private BucketHolder(Bucket bucket) {
            this.bucket = bucket;
            this.lastTouchedAtNanos = System.nanoTime();
        }

        private Bucket bucket() {
            return bucket;
        }

        private long lastTouchedAtNanos() {
            return lastTouchedAtNanos;
        }

        private void touch() {
            this.lastTouchedAtNanos = System.nanoTime();
        }
    }
}
