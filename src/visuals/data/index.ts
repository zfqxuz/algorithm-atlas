import type { Domain, Entry } from '../types';
import { foundations } from './foundations';
import { computing } from './computing';
import { systems } from './systems';

export const domains: Domain[] = [
  { id: 'algorithms', title: '算法与数据结构', en: 'Algorithms & Data Structures', note: '查找、图、树、字符串与概率结构' },
  { id: 'optimization', title: '优化与运筹', en: 'Optimization & Operations Research', note: '梯度、群体搜索、线性规划与分支定界' },
  { id: 'ml', title: '机器学习', en: 'Machine Learning', note: '监督学习、树模型、聚类与降维' },
  { id: 'neural', title: '神经网络与 Transformer', en: 'Neural Networks & Transformers', note: '从感知机到注意力、扩散与 GPT' },
  { id: 'os', title: '操作系统', en: 'Operating Systems', note: '进程、内存、文件、I/O 与同步' },
  { id: 'arch', title: '体系结构与指令集', en: 'Architecture & ISA', note: '流水线、缓存、一致性、SIMD 与 ABI' },
  { id: 'network', title: '网络与拓扑', en: 'Networks & Topology', note: '分层、拓扑、路由、TCP 与子网' },
  { id: 'db', title: '数据库与存储', en: 'Databases & Storage', note: '索引、连接、事务、MVCC 与 LSM' },
  { id: 'compiler', title: '编译原理与语言', en: 'Compilers & Languages', note: '词法、语法、IR、SSA、寄存器与 GC' },
  { id: 'distributed', title: '分布式系统', en: 'Distributed Systems', note: 'CAP、共识、复制、分片与 MapReduce' },
  { id: 'security', title: '安全与密码学', en: 'Security & Cryptography', note: 'AES、RSA、DH、Merkle、TLS 与 ZKP' },
  { id: 'graphics', title: '计算机图形学', en: 'Computer Graphics', note: '光栅化、纹理、抗锯齿与光线追踪' },
  { id: 'theory', title: '计算理论', en: 'Theory of Computation', note: '自动机、文法、图灵机与不可判定性' },
  { id: 'se', title: '软件工程与人机交互', en: 'Software Engineering & HCI', note: '版本控制、CI、测试与微服务' },
];

export const entries: Entry[] = [...foundations, ...computing, ...systems];

export const domainCounts = new Map(
  domains.map((domain) => [domain.id, entries.filter((item) => item.domain === domain.id).length]),
);

export const entryById = new Map(entries.map((item) => [item.id, item]));
