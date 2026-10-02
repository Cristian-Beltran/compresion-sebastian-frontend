import { useEffect, useRef, useState, useCallback } from "react";
import mqtt, { type MqttClient } from "mqtt";

const MQTT_WS_URL = import.meta.env.VITE_MQTT_WS_URL as string | undefined ?? "wss://server-local.tail9af6ac.ts.net";
const MQTT_USER = import.meta.env.VITE_MQTT_USER as string | undefined ?? "";
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD as string | undefined ?? "";
const DEVICE_ID = "esp32-01";
const TOPIC_ROOT = "sebastian";

export const MQTT_TOPICS = {
  telemetry: `${TOPIC_ROOT}/device/${DEVICE_ID}/telemetry`,
  status: `${TOPIC_ROOT}/device/${DEVICE_ID}/status`,
  control: `${TOPIC_ROOT}/device/${DEVICE_ID}/control`,
  ack: `${TOPIC_ROOT}/device/${DEVICE_ID}/cmd/ack`,
  alerts: `${TOPIC_ROOT}/device/${DEVICE_ID}/alerts`,
} as const;

let sharedClient: MqttClient | null = null;
let clientRefCount = 0;

function getMqttClient(): MqttClient {
  if (sharedClient) {
    clientRefCount++;
    return sharedClient;
  }
  const connectOptions: Record<string, unknown> = {
    clientId: `sebastian-fe-${Math.random().toString(16).slice(2, 10)}`,
    reconnectPeriod: 2000,
    connectTimeout: 10_000,
  };
  if (MQTT_USER) {
    connectOptions.username = MQTT_USER;
    connectOptions.password = MQTT_PASSWORD;
  }
  sharedClient = mqtt.connect(MQTT_WS_URL, connectOptions);
  clientRefCount = 1;
  return sharedClient;
}

function releaseMqttClient() {
  clientRefCount--;
  if (clientRefCount <= 0 && sharedClient) {
    sharedClient.end(true);
    sharedClient = null;
    clientRefCount = 0;
  }
}

export function useMqttStatus() {
  const [online, setOnline] = useState(false);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    const client = getMqttClient();
    clientRef.current = client;
    const onConnect = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onClose = () => setOnline(false);
    const onError = () => setOnline(false);
    client.on("connect", onConnect);
    client.on("offline", onOffline);
    client.on("close", onClose);
    client.on("error", onError);
    return () => {
      client.removeListener("connect", onConnect);
      client.removeListener("offline", onOffline);
      client.removeListener("close", onClose);
      client.removeListener("error", onError);
      releaseMqttClient();
    };
  }, []);

  return online;
}

export function useMqttSubscribe<T = Record<string, unknown>>(
  topic: string,
  onMessage?: (payload: T) => void,
) {
  const [lastPayload, setLastPayload] = useState<T | null>(null);
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    const client = getMqttClient();
    const handler = (receivedTopic: string, message: Buffer) => {
      if (receivedTopic !== topic) return;
      try {
        const payload = JSON.parse(message.toString()) as T;
        setLastPayload(payload);
        callbackRef.current?.(payload);
      } catch {
        // ignore invalid JSON
      }
    };
    client.on("connect", () => {
      client.subscribe(topic);
    });
    client.on("message", handler);
    if (client.connected) {
      client.subscribe(topic);
    }
    return () => {
      client.removeListener("message", handler);
      client.unsubscribe(topic);
      releaseMqttClient();
    };
  }, [topic]);

  return lastPayload;
}

export function useMqttPublish() {
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    clientRef.current = getMqttClient();
    return () => {
      releaseMqttClient();
    };
  }, []);

  return useCallback((topic: string, payload: Record<string, unknown>) => {
    if (!clientRef.current?.connected) return false;
    clientRef.current.publish(topic, JSON.stringify(payload), { qos: 1 });
    return true;
  }, []);
}
