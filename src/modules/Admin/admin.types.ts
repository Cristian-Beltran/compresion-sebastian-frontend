export type GroupTelemetry = {
  groupId: number;
  enabled: boolean;
  state: string;
  pressureKpa: number;
  targetPressureKpa: number;
  pressureRaw?: number;
  pressureTareRaw?: number;
  pressureCountsPerKpa?: number;
  pressureSensorAvailable?: boolean;
  forceNewtons: number;
  forceRaw?: number;
  forceBaseline?: number;
  forceScaleMultiplier?: number;
  forceSensorAvailable?: boolean;
  cycleIndex: number;
  cycleTarget: number;
  pumpOn: boolean;
  valveClosed: boolean;
  inflateTimeMs: number;
  holdTimeMs: number;
  releaseTimeMs: number;
  holdRemainingMs?: number;
};

export type DeviceTelemetry = {
  timestamp: string | number;
  state: string;
  online?: boolean;
  temperatureC: number | null;
  temperature1C?: number | null;
  temperature2C?: number | null;
  temperature1Valid?: boolean;
  temperature2Valid?: boolean;
  fanPowerPercent?: number;
  wifiRssi?: number;
  maintenanceMode?: boolean;
  calibrationVersion?: number;
  treatmentId?: string;
  activeMask?: number;
  groups?: GroupTelemetry[];
  error?: string;
};

export type DeviceStatus = {
  connected: boolean;
  online: boolean;
  brokerConnected: boolean;
  state: string;
  updatedAt: string;
  lastSeenAt?: string;
  maintenanceMode?: boolean;
  treatmentRunning?: boolean;
  treatmentId?: string;
  activeMask?: number;
  wifiRssi?: number;
  temperatureC?: number | null;
  temperature1C?: number | null;
  temperature2C?: number | null;
  fanPowerPercent?: number;
  calibrationVersion?: number;
  groups?: GroupTelemetry[];
  lastAck?: Record<string, unknown> | null;
  error?: string;
};

export type SystemLog = {
  id: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  category?: string | null;
  eventType?: string | null;
  groupId?: number | null;
  treatmentId?: string | null;
  actorUserId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type Calibration = {
  id: string;
  groupId: number;
  sensorType: "pressure" | "force";
  status: "pending" | "zeroed" | "completed" | "failed";
  zeroRaw?: number | null;
  referenceRaw?: number | null;
  referenceValue?: number | null;
  referenceUnit?: string | null;
  priorCoefficient?: number | null;
  coefficient?: number | null;
  actorUserId: string;
  notes?: string | null;
  failureReason?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export type TreatmentHistory = {
  id: string;
  patientName?: string;
  patientId: string;
  status: string;
  groups?: GroupTelemetry[];
  cycleCount: number;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number;
};
