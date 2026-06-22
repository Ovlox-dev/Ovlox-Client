import { apiClient } from "@/shared/api/client";

/** Admin-only forecasting. All routes require UserRole.ADMIN (RoleGuard) — handle 403 gracefully. */

export type VelocityTrend = "increasing" | "stable" | "declining";
export type OutlookRiskLevel = "low" | "medium" | "high" | "critical";

export interface ProjectOutlookFeature {
    featureId?: string;
    featureTitle: string;
    predictedDeliveryDate?: string | null;
    /** 0..1 */
    deliveryConfidence?: number | null;
    keyRisks?: string[];
    reasoning?: string;
}

/** Shape of the LLM `forecast` payload from GET /admin/forecast/:id (kept permissive — the model can omit fields). */
export interface ProjectOutlook {
    summary?: {
        projectVelocityTrend?: VelocityTrend | string;
        overallRiskLevel?: OutlookRiskLevel | string;
        narrative?: string;
    };
    features?: ProjectOutlookFeature[];
}

export interface ProjectForecast {
    project: { id: string; name: string; organizationId: string };
    generatedAt: string;
    model: string;
    caveats: string[];
    snapshotInputs: {
        openFeatureCount: number;
        recentEventCount: number;
        openIncidentCount: number;
        recentRiskAlertCount: number;
    };
    forecast: ProjectOutlook;
    cached: boolean;
}

export interface FeatureForecast {
    id: string;
    title: string;
    status: string;
    estimatedDays?: number;
    confidence?: number;
    forecastedCompletionDate?: string;
    reasoning?: string;
}

export interface ForecastAccuracyRow {
    modelVersion: string;
    completedForecasts: number;
    averageAccuracy: number;
    meanAbsoluteError: number;
    period: string;
}

export const getProjectForecast = async (projectIdOrSlug: string): Promise<ProjectForecast> => {
    const res = await apiClient.get<ProjectForecast>(`/admin/forecast/${projectIdOrSlug}`);
    return res.data;
};

export const getProjectFeatureForecast = async (projectIdOrSlug: string): Promise<{ features: FeatureForecast[] }> => {
    const res = await apiClient.get<{ features: FeatureForecast[] }>(`/admin/forecast/${projectIdOrSlug}/features`);
    return res.data;
};

export const getForecastAccuracy = async (
    params?: { from?: string; to?: string; modelVersion?: string },
): Promise<{ accuracy: ForecastAccuracyRow[] }> => {
    const res = await apiClient.get<{ accuracy: ForecastAccuracyRow[] }>(`/admin/forecast/accuracy`, { params });
    return res.data;
};

export const backfillForecastSnapshots = async (days = 30): Promise<{ results: Array<{ date: string; snapshotsCreated: number }> }> => {
    const res = await apiClient.post<{ results: Array<{ date: string; snapshotsCreated: number }> }>(
        `/admin/forecast/backfill-snapshots`,
        {},
        { params: { days } },
    );
    return res.data;
};
