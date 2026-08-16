package com.siyamuddin.saas.Config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.siyamuddin.saas.Exceptions.ErrorCode;
import com.siyamuddin.saas.Payloads.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class JacksonConfigTest {

    @Test
    void serializesApiResponseTimestampWithoutException() {
        JacksonConfig jacksonConfig = new JacksonConfig();
        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder();
        jacksonConfig.javaTimeCustomizer().customize(builder);
        ObjectMapper objectMapper = builder.build();

        ApiResponse apiResponse = new ApiResponse(
                "User already exists",
                false,
                ErrorCode.USER_ALREADY_EXISTS
        );

        assertThatCode(() -> {
            String json = objectMapper.writeValueAsString(apiResponse);
            assertThat(json).contains("\"timestamp\"");
        }).doesNotThrowAnyException();
    }
}
