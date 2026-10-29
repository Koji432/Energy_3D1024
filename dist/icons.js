const svg = body => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
export const circuitIcon=svg('<path d="M12 20V7h27v11l4 3-8 4 8 4-8 4 4 3v6H12V28M6 20h12M9 27h6"/>');
export const productIcon=svg('<path d="M27 7H9a3 3 0 0 0-3 3v22h19M6 32 2 42h27M2 42h42l-4-10h-5M11 37h12M28 7v9l-7 7v11M35 7v12l-8 8v10M42 9v14l-9 9v10"/><rect x="29" y="20" width="8" height="8" rx="1"/><path d="M31 17v3m4-3v3m-6 3h-3m11 0h4m-10 5v4m4-4v3"/><circle cx="28" cy="7" r="2"/><circle cx="35" cy="7" r="2"/><circle cx="42" cy="7" r="2"/>');
export const deviceIcons={
 flashlight:svg('<path d="m7 34 17-17 8 8-17 17a3 3 0 0 1-4 0l-4-4a3 3 0 0 1 0-4ZM24 17l3-8 12 12-7 4M27 9l3-3 12 12-3 3M10 31l2 2m1-5 2 2m9-6-6 6"/>'),
 fan:svg('<circle cx="24" cy="17" r="14"/><circle cx="24" cy="17" r="3"/><path d="M24 31v11M15 44h18M23 14c-11-13-14 8-3 5m7-2c16 0-3-17-4-6m0 10c-3 16 16 2 4-3"/>'),
 cleaner:svg('<rect x="7" y="7" width="34" height="35" rx="2"/><path d="M7 17h34M12 11h24M12 23v9m5-9v9m5-9v9m5-9v9"/><rect x="33" y="25" width="4" height="7" rx=".6"/>'),
 vacuum:svg('<circle cx="24" cy="24" r="20"/><circle cx="24" cy="24" r="15"/><circle cx="24" cy="23" r="7"/><path d="M24 19v4m-3-2a4 4 0 1 0 6 0M11 36c8 5 18 5 26-2M19 40h10"/>'),
 controller:svg('<path d="M14 11c-5-2-8 3-10 12L2 35c0 6 5 9 9 3l6-8h14l6 8c4 6 9 3 9-3l-2-12c-2-9-5-14-10-12Z"/><circle cx="13" cy="19" r="4"/><circle cx="29" cy="27" r="4"/><path d="M14 25v9m-5-5h10M24 14v3"/><circle cx="35" cy="16" r="1"/><circle cx="39" cy="20" r="1"/><circle cx="31" cy="20" r="1"/><circle cx="35" cy="24" r="1"/>'),
 drone:svg('<rect x="18" y="17" width="12" height="15" rx="4"/><path d="m18 18-9-8m21 8 9-8M18 31l-9 8m21-8 9 8"/><ellipse cx="8" cy="9" rx="7" ry="3"/><ellipse cx="40" cy="9" rx="7" ry="3"/><ellipse cx="8" cy="39" rx="7" ry="3"/><ellipse cx="40" cy="39" rx="7" ry="3"/>'),
 roadster:svg('<path d="m4 29 4-8 10-7h13l8 8 5 3v9H4Zm4-8 30 1M18 14l-3 8m14-8 6 8M4 34h5m9 0h13m9 0h4M2 16h9m-6 0v6M8 28h5m23 0h5"/><circle cx="13" cy="34" r="5"/><circle cx="36" cy="34" r="5"/><path d="M15 42v4m-3-2 3 2 3-2M34 42v4m-3-2 3 2 3-2"/>'),
};
export const disassembleIcon=svg('<path d="m24 5 18 9-18 10L6 14 24 5ZM6 23l18 10 18-10M6 33l18 10 18-10"/>');
export const assembleIcon=svg('<path d="M6 29 24 39l18-10M6 20l18 10 18-10M24 25V5m-7 7 7-7 7 7"/>');
