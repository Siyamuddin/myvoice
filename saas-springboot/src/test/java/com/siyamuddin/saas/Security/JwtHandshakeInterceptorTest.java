package com.siyamuddin.saas.Security;

import com.siyamuddin.saas.Entity.User;
import com.siyamuddin.saas.Services.CustomUserDetailService;
import com.siyamuddin.saas.Services.TokenBlacklistService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtHandshakeInterceptorTest {

    @Mock
    private JwtHelper jwtHelper;

    @Mock
    private CustomUserDetailService customUserDetailService;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private ServerHttpRequest request;

    @Mock
    private ServerHttpResponse response;

    @Mock
    private WebSocketHandler wsHandler;

    private JwtHandshakeInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new JwtHandshakeInterceptor(jwtHelper, customUserDetailService, tokenBlacklistService);
    }

    @Test
    void beforeHandshakeRejectsWhenTokenMissing() {
        when(request.getURI()).thenReturn(URI.create("ws://localhost/ws/voice"));

        Map<String, Object> attributes = new HashMap<>();
        boolean accepted = interceptor.beforeHandshake(request, response, wsHandler, attributes);

        assertThat(accepted).isFalse();
        assertThat(attributes).isEmpty();
    }

    @Test
    void beforeHandshakeAcceptsValidNonBlacklistedTokenAndSetsAttributes() {
        String token = "valid.jwt.token";
        when(request.getURI()).thenReturn(URI.create("ws://localhost/ws/voice?token=" + token));

        User user = new User();
        user.setId(7);
        user.setEmail("voice@example.com");
        user.setName("Voice User");
        user.setPassword("secret");

        when(jwtHelper.getUsernameFromToken(token)).thenReturn("voice@example.com");
        when(customUserDetailService.loadUserByUsername("voice@example.com")).thenReturn(user);
        when(tokenBlacklistService.isTokenBlacklisted(token)).thenReturn(false);
        when(jwtHelper.validateToken(token, user)).thenReturn(true);

        Map<String, Object> attributes = new HashMap<>();
        boolean accepted = interceptor.beforeHandshake(request, response, wsHandler, attributes);

        assertThat(accepted).isTrue();
        assertThat(attributes.get("userId")).isEqualTo(7);
        assertThat(attributes.get("username")).isEqualTo("voice@example.com");
        assertThat(attributes.get("user")).isSameAs(user);
        verify(tokenBlacklistService).isTokenBlacklisted(token);
    }

    @Test
    void beforeHandshakeRejectsWhenTokenThrows() {
        String token = "bad.jwt.token";
        when(request.getURI()).thenReturn(URI.create("ws://localhost/ws/voice?token=" + token));
        when(jwtHelper.getUsernameFromToken(token))
                .thenThrow(new MalformedJwtException("malformed"));

        Map<String, Object> attributes = new HashMap<>();
        boolean accepted = interceptor.beforeHandshake(request, response, wsHandler, attributes);

        assertThat(accepted).isFalse();
        assertThat(attributes).isEmpty();
    }

    @Test
    void beforeHandshakeRejectsExpiredToken() {
        String token = "expired.jwt.token";
        when(request.getURI()).thenReturn(URI.create("ws://localhost/ws/voice?token=" + token));
        when(jwtHelper.getUsernameFromToken(token))
                .thenThrow(new ExpiredJwtException(null, null, "expired"));

        Map<String, Object> attributes = new HashMap<>();
        boolean accepted = interceptor.beforeHandshake(request, response, wsHandler, attributes);

        assertThat(accepted).isFalse();
        assertThat(attributes).isEmpty();
    }
}
