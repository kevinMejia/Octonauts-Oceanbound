// Preview-only camera/light tuning; loaders already normalize native forward axes.
export const discoveryPreviewConfig={
 size:512,edge:.86,cropPadding:.035,
 views:{crew:{yaw:0,elevation:3},
  // Original marine camera direction: x .8, y .4, z 1.
  marine:{yaw:Math.atan2(.8,1)*180/Math.PI,elevation:Math.atan2(.4,Math.hypot(.8,1))*180/Math.PI,crop:true,edge:.94}},
 light:{sky:0xffffff,ground:0x8c8c8c,ambient:1.6,key:2.2,fill:.8},
};
