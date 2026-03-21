import React, { useEffect, useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { STATE_NAMES } from '../lib/utils';
import { motion } from 'framer-motion';

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const fipsToAbbr: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI", "56": "WY"
};

export function USMap() {
  const [statesData, setStatesData] = useState<Record<string, number>>({});
  const [tooltip, setTooltip] = useState<{ content: string, x: number, y: number } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'states'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Record<string, number> = {};
      snapshot.forEach((doc) => {
        data[doc.id] = doc.data().totalClicks || 0;
      });
      setStatesData(data);
    });
    return () => unsub();
  }, []);

  const maxValue = useMemo(() => {
    const vals = Object.values(statesData);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [statesData]);

  const colorScale = scaleLinear<string>()
    .domain([0, maxValue])
    .range(["#e2e8f0", "#ef4444"]); // slate-200 to red-500

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-4xl mx-auto mt-12 bg-white rounded-2xl border-4 border-blue-900 p-6 shadow-xl"
    >
      <h3 className="text-center text-blue-900 text-xl uppercase tracking-widest mb-6 font-display">National Domination Map</h3>
      <ComposableMap projection="geoAlbersUsa" className="w-full h-auto">
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map(geo => {
              const stateAbbr = fipsToAbbr[geo.id];
              const curValue = statesData[stateAbbr] || 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={curValue > 0 ? colorScale(curValue) : "#f8fafc"}
                  stroke="#1e3a8a"
                  strokeWidth={1}
                  onMouseEnter={(e) => {
                    setTooltip({
                      content: `${STATE_NAMES[stateAbbr] || stateAbbr}: ${curValue.toLocaleString()} clicks`,
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseMove={(e) => {
                    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                  }}
                  onMouseLeave={() => {
                    setTooltip(null);
                  }}
                  style={{
                    default: { outline: "none", transition: "all 250ms" },
                    hover: { fill: "#60a5fa", outline: "none", cursor: "pointer", transition: "all 250ms" },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {tooltip && (
        <div 
          className="fixed z-50 bg-blue-900 text-white px-3 py-2 rounded-lg font-bold text-sm pointer-events-none shadow-xl border-2 border-blue-400"
          style={{ top: tooltip.y + 15, left: tooltip.x + 15 }}
        >
          {tooltip.content}
        </div>
      )}
    </motion.div>
  );
}
