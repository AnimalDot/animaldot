/**
 * Kafka connection scaffolding.
 * Use with a Kafka client (e.g. kafkajs) to produce/consume vitals stream.
 *
 * Example consumer: read from topic, validate schema, push to Redis Streams
 * or write to TSDB. Bridge to WebSocket for real-time dashboard updates.
 */

import { config } from '../config/env';

export const kafkaConfig = {
  brokers: config.kafka.bootstrapServers.split(','),
  topicVitals: config.kafka.topicVitals,
};

// Example: const { Kafka } = require('kafkajs');
// const kafka = new Kafka({ clientId: 'animaldot-backend', brokers: kafkaConfig.brokers });
// const consumer = kafka.consumer({ groupId: 'vitals-processor' });
// await consumer.connect(); await consumer.subscribe({ topic: kafkaConfig.topicVitals });
