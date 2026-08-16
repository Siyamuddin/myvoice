package com.siyamuddin.saas.Config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.siyamuddin.saas.Payloads.ApiResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class AppConfigTest {

    @Test
    void objectMapperSerializesApiResponseTimestampWithoutException() {
        ObjectMapper objectMapper = new AppConfig().objectMapper();

        assertThatCode(() -> {
            String json = objectMapper.writeValueAsString(new ApiResponse("x", true));
            assertThat(json).contains("\"timestamp\"");
        }).doesNotThrowAnyException();
    }
}
