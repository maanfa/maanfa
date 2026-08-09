# tsconfig.json 踩坑记录

## --isolatedDeclarations

这个要你显式写出来所有类型标注，哪怕是返回值。这个配置项有利于 oxc-transform 生成 d.ts 的 sourcemap
