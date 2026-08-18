package com.siyamuddin.saas.Config;

import com.siyamuddin.saas.Config.Properties.CorsProperties;
import com.siyamuddin.saas.Security.JwtHandshakeInterceptor;
import com.siyamuddin.saas.Services.Voice.VoiceWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

import java.util.List;

@Slf4j
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class VoiceWebSocketConfig implements WebSocketConfigurer {

    private final VoiceWebSocketHandler voiceWebSocketHandler;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
    private final CorsProperties corsProperties;

    @Bean
    public ServletServerContainerFactoryBean voiceWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(2 * 1024 * 1024);
        container.setMaxBinaryMessageBufferSize(1024 * 1024);
        container.setMaxSessionIdleTimeout(3_600_000L);
        return container;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        List<String> allowedOrigins = corsProperties.getAllowedOrigins();
        if (allowedOrigins == null || allowedOrigins.isEmpty()) {
            log.warn("No CORS allowed origins configured for /ws/voice — handshake may reject browser origins");
            allowedOrigins = List.of();
        }

        registry.addHandler(voiceWebSocketHandler, "/ws/voice")
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOrigins(allowedOrigins.toArray(new String[0]));
    }
}
