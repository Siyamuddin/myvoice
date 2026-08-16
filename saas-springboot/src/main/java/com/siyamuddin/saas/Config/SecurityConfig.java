package com.siyamuddin.saas.Config;

import com.siyamuddin.saas.Config.Properties.CorsProperties;
import com.siyamuddin.saas.Security.JwtAuthenticationEntryPoint;
import com.siyamuddin.saas.Security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String[] BASE_PUBLIC_URLS = {
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/verify-email",
            "/api/v1/auth/resend-verification",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/reset-password",
            "/api/v1/auth/oauth/enabled",
            "/api/v1/auth/oauth/google/authorize",
            "/api/v1/auth/oauth/google/callback",
            "/uploads/public/**",
            "/ws/**" // WebSocket handshake — auth enforced by JwtHandshakeInterceptor at handshake time
    };

    private static final String[] ACTUATOR_PUBLIC_URLS = {
            "/actuator/health"
    };

    private static final String[] SWAGGER_URLS = {
            "/v3/api-docs/**",
            "/v3/api-docs",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/swagger-ui/index.html",
            "/webjars/**"
    };

    private final JwtAuthenticationEntryPoint point;
    private final JwtAuthenticationFilter filter;
    private final CorsProperties corsProperties;
    private final Environment environment;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    @Value("${springdoc.api-docs.enabled:true}")
    private boolean swaggerApiDocsEnabled;

    @Value("${springdoc.swagger-ui.enabled:true}")
    private boolean swaggerUiEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        String[] publicUrls = getPublicUrls();

        log.info("Configuring security with {} public URLs", publicUrls.length);
        if (log.isDebugEnabled()) {
            log.debug("Public URLs: {}", Arrays.toString(publicUrls));
        }

        http.csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(publicUrls).permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex.authenticationEntryPoint(point))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp
                                .policyDirectives("default-src 'self'; " +
                                        "script-src 'self'; " +
                                        "style-src 'self' 'unsafe-inline'; " +
                                        "img-src 'self' data: https:; " +
                                        "font-src 'self' data:; " +
                                        "connect-src 'self' ws: wss:; " +
                                        "frame-ancestors 'none'; " +
                                        "base-uri 'self'; " +
                                        "form-action 'self'")
                        )
                        .xssProtection(xss -> xss
                                .headerValue(org.springframework.security.web.header.writers.XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK)
                        )
                        .frameOptions(frame -> frame.deny())
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000)
                        )
                );
        http.addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private String[] getPublicUrls() {
        List<String> urls = new ArrayList<>(Arrays.asList(BASE_PUBLIC_URLS));
        urls.addAll(Arrays.asList(ACTUATOR_PUBLIC_URLS));

        if (swaggerApiDocsEnabled || swaggerUiEnabled) {
            urls.addAll(Arrays.asList(SWAGGER_URLS));
            log.debug("Swagger URLs enabled. API Docs: {}, Swagger UI: {}",
                    swaggerApiDocsEnabled, swaggerUiEnabled);
        } else {
            log.debug("Swagger URLs disabled. API Docs: {}, Swagger UI: {}",
                    swaggerApiDocsEnabled, swaggerUiEnabled);
        }

        return urls.toArray(new String[0]);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        List<String> allowedOrigins = getCorsAllowedOrigins();

        if (allowedOrigins.isEmpty()) {
            log.warn("No CORS origins configured. CORS may not work correctly. " +
                    "Set APP_CORS_ALLOWED_ORIGINS environment variable or configure in properties.");
        } else {
            log.info("CORS configured with {} allowed origin(s)", allowedOrigins.size());
        }

        configuration.setAllowedOriginPatterns(allowedOrigins);

        List<String> allowedMethods = corsProperties.getAllowedMethods();
        if (allowedMethods == null || allowedMethods.isEmpty()) {
            allowedMethods = Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH");
            log.warn("CORS allowed methods not configured, using defaults: {}", allowedMethods);
        }
        configuration.setAllowedMethods(allowedMethods);

        List<String> allowedHeaders = corsProperties.getAllowedHeaders();
        if (allowedHeaders == null || allowedHeaders.isEmpty()) {
            allowedHeaders = Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "X-Request-ID");
            log.warn("CORS allowed headers not configured, using defaults: {}", allowedHeaders);
        }
        configuration.setAllowedHeaders(allowedHeaders);

        configuration.setExposedHeaders(Arrays.asList("X-Request-ID", "X-Total-Count"));
        configuration.setAllowCredentials(corsProperties.getAllowCredentials());

        Long maxAge = corsProperties.getMaxAge();
        if (maxAge == null || maxAge <= 0) {
            maxAge = 3600L;
            log.warn("CORS max age not configured, using default: {} seconds", maxAge);
        }
        configuration.setMaxAge(maxAge);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    private List<String> getCorsAllowedOrigins() {
        String envOrigins = environment.getProperty("APP_CORS_ALLOWED_ORIGINS");

        if (envOrigins != null && !envOrigins.trim().isEmpty()) {
            List<String> origins = new ArrayList<>();
            for (String origin : envOrigins.split(",")) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty()) {
                    origins.add(trimmed);
                }
            }
            if (!origins.isEmpty()) {
                return origins;
            }
        }

        return corsProperties.getAllowedOrigins();
    }

    @Bean
    public DaoAuthenticationProvider daoAuthenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration builder) throws Exception {
        return builder.getAuthenticationManager();
    }
}
