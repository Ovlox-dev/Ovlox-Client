import { useMutation, useQuery } from "@tanstack/react-query";

import {
    backfillForecastSnapshots,
    getForecastAccuracy,
    getProjectFeatureForecast,
    getProjectForecast,
} from "../api/forecast.api";

export const forecastKeys = {
    all: ["forecast"] as const,
    project: (projectId: string) => [...forecastKeys.all, "project", projectId] as const,
    features: (projectId: string) => [...forecastKeys.all, "features", projectId] as const,
    accuracy: (params?: unknown) => [...forecastKeys.all, "accuracy", params] as const,
};

export const useProjectForecast = (projectIdOrSlug: string, enabled = true) =>
    useQuery({
        queryKey: forecastKeys.project(projectIdOrSlug),
        queryFn: () => getProjectForecast(projectIdOrSlug),
        enabled: !!projectIdOrSlug && enabled,
        retry: false, // 403 for non-admins shouldn't retry
    });

export const useProjectFeatureForecast = (projectIdOrSlug: string, enabled = true) =>
    useQuery({
        queryKey: forecastKeys.features(projectIdOrSlug),
        queryFn: () => getProjectFeatureForecast(projectIdOrSlug),
        enabled: !!projectIdOrSlug && enabled,
        retry: false,
    });

export const useForecastAccuracy = (params?: { from?: string; to?: string; modelVersion?: string }, enabled = true) =>
    useQuery({
        queryKey: forecastKeys.accuracy(params),
        queryFn: () => getForecastAccuracy(params),
        enabled,
        retry: false,
    });

export const useBackfillForecastSnapshots = () =>
    useMutation({
        mutationFn: (days?: number) => backfillForecastSnapshots(days),
    });
