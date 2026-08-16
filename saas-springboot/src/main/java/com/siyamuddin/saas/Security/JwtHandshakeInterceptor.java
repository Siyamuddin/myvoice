package com.siyamuddin.saas.Security;

import com.siyamuddin.saas.Entity.User;
import com.siyamuddin.saas.Services.CustomUserDetailService;
import com.siyamuddin.saas.Services.TokenBlacklistService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtHelper jwtHelper;
    private final CustomUserDetailService customUserDetailService;
    private final TokenBlacklistService tokenBlacklistService;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        try {
            String token = resolveToken(request);
            if (token == null || token.isBlank()) {
                log.warn("WebSocket handshake rejected: missing or blank token");
                return false;
            }

            String username = jwtHelper.getUsernameFromToken(token);
            UserDetails userDetails = customUserDetailService.loadUserByUsername(username);
            User user = (User) userDetails;

            if (tokenBlacklistService.isTokenBlacklisted(token)) {
                log.warn("WebSocket handshake rejected: token is blacklisted for user {}", username);
                return false;
            }

            if (!Boolean.TRUE.equals(jwtHelper.validateToken(token, userDetails))) {
                log.warn("WebSocket handshake rejected: token validation failed for user {}", username);
                return false;
            }

            attributes.put("userId", user.getId());
            attributes.put("username", user.getUsername());
            attributes.put("user", user);
            return true;
        } catch (ExpiredJwtException | MalformedJwtException e) {
            log.warn("WebSocket handshake rejected: invalid JWT — {}", e.getMessage());
            return false;
        } catch (Exception e) {
            log.warn("WebSocket handshake rejected: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        log.debug("WebSocket handshake completed for {}", request.getURI());
    }

    private String resolveToken(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String token = servletRequest.getServletRequest().getParameter("token");
            if (token != null) {
                return token;
            }
        }
        MultiValueMap<String, String> params =
                UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
        return params.getFirst("token");
    }
}
