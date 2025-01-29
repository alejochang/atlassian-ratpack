package com.adaptavist.cloud.interviews;

import com.adaptavist.cloud.interviews.model.*;
import com.adaptavist.cloud.interviews.services.ProxyClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableMap;
import com.google.inject.Inject;
import ratpack.exec.Promise;
import ratpack.http.HttpMethod;
import ratpack.http.client.ReceivedResponse;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.List;

import static ratpack.http.Status.NO_CONTENT;
import static ratpack.http.Status.OK;

public class DynamicModulesRegistrar {

    private static final String endpoint = "/rest/atlassian-connect/1/app/module/dynamic";
    private final ProxyClient proxyClient;
    private final ObjectMapper objectMapper;
    private final URIParts uriParts = ImmutableURIParts.builder()
            .path(endpoint)
            .build();

    @Inject
    public DynamicModulesRegistrar(ProxyClient proxyClient, ObjectMapper objectMapper) {
        this.proxyClient = proxyClient;
        this.objectMapper = objectMapper;
    }

    public Promise<Boolean> registerModules(List<DynamicModule> modules, Tenant tenant) {
        DynamicModules dynamicModules = ImmutableDynamicModules.builder()
                .jiraEntityProperties(modules)
                .build();

        return proxyClient.proxyWithPayload(tenant, HttpMethod.POST, uriParts, dynamicModules, ExecutionUser.ADD_ON)
                .map(response -> response.getStatusCode() == OK.getCode())
                .mapError(SocketTimeoutException.class, e -> {
                    // Log the timeout exception if necessary
                    return false;
                })
                .mapError(e -> {
                    // Re-throw other exceptions to be handled upstream
                    throw new RuntimeException(e);
                });
    }

    public Promise<Boolean> deregisterModule(String moduleKey, Tenant tenant) {
        URIParts uri = ImmutableURIParts.builder()
                .path(endpoint)
                .queryParams(ImmutableMap.of("moduleKey", moduleKey))
                .build();

        return proxyClient.proxy(tenant, HttpMethod.DELETE, uri)
                .map(response -> response.getStatusCode() == NO_CONTENT.getCode())
                .mapError(e -> {
                    // Log the exception if necessary
                    return false;
                });
    }

    public Promise<List<DynamicModule>> getModules(Tenant tenant) {
        return proxyClient.proxy(tenant, HttpMethod.GET, uriParts)
                .map((ReceivedResponse response) -> {
                    if (response.getStatusCode() == OK.getCode()) {
                        try {
                            DynamicModules result = objectMapper.readValue(response.getBody().getInputStream(), DynamicModules.class);
                            return result.jiraEntityProperties();
                        } catch (IOException e) {
                            throw new RuntimeException("Error parsing dynamic modules response", e);
                        }
                    }
                    throw new RuntimeException("Could not get dynamic modules");
                });
    }
}