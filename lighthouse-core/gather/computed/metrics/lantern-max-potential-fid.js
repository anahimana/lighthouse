/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LanternMetricArtifact = require('./lantern-metric');
const BaseNode = require('../../../lib/dependency-graph/base-node');

/** @typedef {BaseNode.Node} Node */

class LanternMaxPotentialFID extends LanternMetricArtifact {
  get name() {
    return 'LanternMaxPotentialFID';
  }

  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  get COEFFICIENTS() {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5,
    };
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  getOptimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  getPessimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }

  /**
   * @param {LH.Gatherer.Simulation.Result} simulation
   * @param {Object} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  getEstimateFromSimulation(simulation, extras) {
    // Intentionally use the opposite FCP estimate, a more pessimistic FCP means that more tasks
    // are excluded from the FID computation, so a higher FCP means lower FID for same work.
    const fcpTimeInMs = extras.optimistic
      ? extras.fcpResult.pessimisticEstimate.timeInMs
      : extras.fcpResult.optimisticEstimate.timeInMs;

    const events = LanternMaxPotentialFID.getEventsAfterFCP(
      simulation.nodeTimings,
      fcpTimeInMs
    );

    return {
      timeInMs: Math.max(...events.map(evt => evt.duration), 16),
      nodeTimings: simulation.nodeTimings,
    };
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.ComputedArtifacts} artifacts
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  async compute_(data, artifacts) {
    const fcpResult = await artifacts.requestLanternFirstContentfulPaint(data);
    return this.computeMetricWithGraphs(data, artifacts, {fcpResult});
  }

  /**
   * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} fcpTimeInMs
   */
  static getEventsAfterFCP(nodeTimings, fcpTimeInMs) {
    /** @type {Array<{start: number, end: number, duration: number}>} */
    const events = [];
    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== BaseNode.TYPES.CPU) continue;
      if (timing.endTime < fcpTimeInMs) continue;

      events.push({
        start: timing.startTime,
        end: timing.endTime,
        duration: timing.duration,
      });
    }

    return events;
  }
}

module.exports = LanternMaxPotentialFID;
