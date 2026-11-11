/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface GaneshHeaderProps {
  title?: string;
  themeColorClass?: string;
}

export const GaneshHeader: React.FC<GaneshHeaderProps> = ({
  title = '।। श्री गणेशाय नमः ।।',
  themeColorClass = 'text-red-700'
}) => {
  return (
    <div className={`flex items-center justify-center gap-3 py-1 font-devanagari select-none ${themeColorClass}`}>
      {/* Left Auspicious Swastika / Floral filigree */}
      <svg className="w-5 h-5 fill-current opacity-85" viewBox="0 0 24 24">
        <path d="M11 2v9H2v2h9v9h2v-9h9v-2h-9V2h-2zm-2 2H5v5h2V6h2V4zm11 2h-5v2h3v3h2V6zM4 15h2v3h3v2H4v-5zm13 3h-3v2h5v-5h-2v3z" />
      </svg>

      <span className="text-sm md:text-base font-bold tracking-wider px-2 border-b border-t border-current/30 py-0.5">
        {title}
      </span>

      {/* Right Auspicious Swastika / Floral filigree */}
      <svg className="w-5 h-5 fill-current opacity-85" viewBox="0 0 24 24">
        <path d="M11 2v9H2v2h9v9h2v-9h9v-2h-9V2h-2zm-2 2H5v5h2V6h2V4zm11 2h-5v2h3v3h2V6zM4 15h2v3h3v2H4v-5zm13 3h-3v2h5v-5h-2v3z" />
      </svg>
    </div>
  );
};
