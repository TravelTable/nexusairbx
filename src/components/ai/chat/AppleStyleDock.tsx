import {
  Activity,
  Component,
  LineChart,
  Plus,
  SlidersHorizontal,
  Package,
  ScrollText,
  Settings,
  X,
} from 'lucide-react';
import {
  motion,
  MotionValue,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion';
import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type * as React from 'react';
import { cn } from '../../../lib/utils';

const DOCK_HEIGHT = 110;
const DEFAULT_MAGNIFICATION = 64;
const DEFAULT_DISTANCE = 150;
const DEFAULT_PANEL_HEIGHT = 54;

type DockProps = {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  panelHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};
type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  ariaLabel?: string;
  hasPopup?: boolean;
};
type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};
type DockIconProps = {
  className?: string;
  children: React.ReactNode;
};

type DocContextType = {
  mouseX: MotionValue;
  spring: SpringOptions;
  magnification: number;
  distance: number;
};
type DockProviderProps = {
  children: React.ReactNode;
  value: DocContextType;
};

const DockContext = createContext<DocContextType | undefined>(undefined);

function DockProvider({ children, value }: DockProviderProps) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within an DockProvider');
  }
  return context;
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(() => {
    return Math.max(DOCK_HEIGHT, magnification + magnification / 2 + 4);
  }, [magnification]);

  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div
      style={{
        height: height,
        scrollbarWidth: 'none',
      }}
      className='mx-2 flex max-w-full items-end overflow-x-auto'
    >
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1);
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={cn(
          'mx-auto flex w-fit gap-3 rounded-2xl bg-gray-50 px-3 dark:bg-neutral-900',
          className
        )}
        style={{ height: panelHeight }}
        role='toolbar'
        aria-label='Application dock'
      >
        <DockProvider value={{ mouseX, spring, distance, magnification }}>
          {children}
        </DockProvider>
      </motion.div>
    </motion.div>
  );
}

function DockItem({ children, className, onClick, active = false, ariaLabel, hasPopup = false }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { distance, magnification, mouseX, spring } = useDock();

  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (val) => {
    const domRect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - domRect.x - domRect.width / 2;
  });

  const widthTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [40, magnification, 40]
  );

  const width = useSpring(widthTransform, spring);

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
      tabIndex={0}
      role='button'
      aria-label={ariaLabel}
      aria-pressed={hasPopup ? active : undefined}
      aria-haspopup={hasPopup ? 'dialog' : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      {Children.map(children, (child) =>
        cloneElement(
          child as React.ReactElement<{
            width?: MotionValue<number>;
            isHovered?: MotionValue<number>;
          }>,
          { width, isHovered }
        )
      )}
    </motion.div>
  );
}

function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const restProps = rest as Record<string, unknown>;
  const isHovered = restProps['isHovered'] as MotionValue<number>;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });

    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute -top-6 left-1/2 w-fit whitespace-pre rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-neutral-700 dark:border-neutral-900 dark:bg-neutral-800 dark:text-white',
            className
          )}
          role='tooltip'
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>;
  const width = restProps['width'] as MotionValue<number>;

  const widthTransform = useTransform(width, (val) => val / 2);

  return (
    <motion.div
      style={{ width: widthTransform }}
      className={cn('flex items-center justify-center', className)}
    >
      {children}
    </motion.div>
  );
}

type DockAction = 'new-chat' | 'projects' | 'assets' | 'activity' | 'chats' | 'usage';
type DockPopupAction = DockAction | 'build-options';
type DockDataItem = {
  title: string;
  icon: React.ReactNode;
  action?: DockPopupAction;
  href?: string;
};

const data: DockDataItem[] = [
  {
    title: 'New chat',
    icon: (
      <Plus className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    action: 'new-chat',
  },
  {
    title: 'Projects',
    icon: (
      <Package className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    action: 'projects',
  },
  {
    title: 'Assets',
    icon: (
      <Component className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    action: 'assets',
  },
  {
    title: 'Activity',
    icon: (
      <Activity className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    action: 'activity',
  },
  {
    title: 'Chats',
    icon: (
      <ScrollText className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    action: 'chats',
  },
  {
    title: 'Usage',
    icon: (
      <LineChart className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    action: 'usage',
  },
  {
    title: 'Settings',
    icon: (
      <Settings className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    href: '/settings',
  },
  {
    title: 'Build options',
    icon: (
      <SlidersHorizontal className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    action: 'build-options',
  },
];

type DockLibraryView = 'projects' | 'chats';
type DockPopupView = DockLibraryView | 'usage' | 'build-options';

type AppleStyleDockProps = {
  onNewChat?: () => void;
  onOpenAssets?: () => void;
  onOpenActivity?: () => void;
  onOpenBuildOptions?: () => void;
  usageContent?: React.ReactNode;
  buildOptionsContent?: React.ReactNode;
  renderNavigation?: (options: { view: DockLibraryView; onClose: () => void }) => React.ReactNode;
};

export function AppleStyleDock({
  onNewChat,
  onOpenAssets,
  onOpenActivity,
  onOpenBuildOptions,
  usageContent,
  buildOptionsContent,
  renderNavigation,
}: AppleStyleDockProps) {
  const [popupView, setPopupView] = useState<DockPopupView | null>(null);
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  const triggerRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const closePopup = () => { setPopupView(null); triggerRef.current?.focus(); };
  useEffect(() => {
    if (popupView === 'build-options') popupRef.current?.querySelector<HTMLElement>('button, select')?.focus();
    const fitPopup = () => {
      const root = rootRef.current;
      const popup = popupRef.current;
      if (!root || !popup) return;
      const rect = root.getBoundingClientRect();
      const scale = root.offsetWidth ? rect.width / root.offsetWidth : 1;
      const width = window.visualViewport?.width || window.innerWidth;
      const height = window.visualViewport?.height || window.innerHeight;
      popup.style.maxWidth = `${Math.max(120, (width - 24) / scale)}px`;
      popup.style.maxHeight = `${Math.max(80, (Math.min(height, rect.bottom) - 12) / scale - 58)}px`;
    };
    fitPopup();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fitPopup) : null;
    if (rootRef.current) observer?.observe(rootRef.current);
    window.addEventListener('resize', fitPopup);
    window.visualViewport?.addEventListener('resize', fitPopup);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', fitPopup);
      window.visualViewport?.removeEventListener('resize', fitPopup);
    };
  }, [popupView]);

  useEffect(() => {
    if (!popupView) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closePopup();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePopup();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [popupView]);

  const runAction = (item: DockDataItem) => {
    if (
      item.action === 'projects' ||
      item.action === 'chats' ||
      item.action === 'usage' ||
      (item.action === 'build-options' && buildOptionsContent)
    ) {
      const nextView: DockPopupView = item.action;
      triggerRef.current = document.activeElement as HTMLElement;
      setPopupView((current) => current === nextView ? null : nextView);
      return;
    }

    closePopup();
    if (item.action === 'new-chat') onNewChat?.();
    else if (item.action === 'assets') onOpenAssets?.();
    else if (item.action === 'activity') onOpenActivity?.();
    else if (item.action === 'build-options') onOpenBuildOptions?.();
    else if (item.href && typeof window !== 'undefined') window.location.href = item.href;
  };

  return (
    <div ref={rootRef} className='absolute bottom-0 left-1/2 z-30 max-w-full -translate-x-1/2'>
      <AnimatePresence initial={false}>
        {popupView && (
          popupView === 'usage'
            ? usageContent
            : popupView === 'build-options'
              ? buildOptionsContent
              : renderNavigation
        ) ? (
          <motion.div
            ref={popupRef}
            key={popupView}
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97, filter: 'blur(8px)' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.32 }}
            className={cn(
              'absolute bottom-[58px] left-1/2 w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] shadow-2xl backdrop-blur-2xl',
              popupView === 'usage' ? 'min-h-[168px]' : 'h-[min(420px,60vh)]'
            )}
            style={{
              x: '-50%',
              transformOrigin: popupView === 'projects' ? '35% 100%' : popupView === 'chats' ? '65% 100%' : '75% 100%',
            }}
            role='dialog'
            aria-modal='false'
            aria-label={
              popupView === 'projects'
                ? 'Projects'
                : popupView === 'chats'
                  ? 'Chats'
                  : popupView === 'usage'
                    ? 'Usage'
                    : 'Build options'
            }
          >
            {popupView === 'usage' ? (
              <section className='flex min-h-[168px] flex-col p-4' aria-labelledby='dock-usage-title'>
                <div className='flex items-center justify-between gap-3 border-b border-white/10 pb-3'>
                  <div>
                    <p className='text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500'>Account</p>
                    <h2 id='dock-usage-title' className='mt-0.5 text-sm font-semibold text-white'>Usage</h2>
                  </div>
                  <button
                    type='button'
                    className='flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
                    aria-label='Close usage'
                    onClick={closePopup}
                  >
                    <X className='h-4 w-4' aria-hidden='true' />
                  </button>
                </div>
                <div className='flex-1 py-4'>{usageContent}</div>
                <a
                  href='/billing'
                  className='inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-xs font-semibold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
                >
                  Manage plan and billing
                </a>
              </section>
            ) : popupView === 'build-options' ? (
              <section className='flex h-full min-h-0 flex-col p-4' aria-labelledby='dock-build-options-title'>
                <div className='flex items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] pb-3'>
                  <div>
                    <p className='text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ds-text-muted)]'>Workspace</p>
                    <h2 id='dock-build-options-title' className='mt-0.5 text-sm font-semibold text-[var(--ds-text)]'>Build options</h2>
                  </div>
                  <button
                    type='button'
                    className='flex h-9 w-9 items-center justify-center rounded-full text-[var(--ds-text-muted)] transition-colors duration-200 hover:bg-white/10 hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
                    aria-label='Close build options'
                    onClick={closePopup}
                  >
                    <X className='h-4 w-4' aria-hidden='true' />
                  </button>
                </div>
                <div className='min-h-0 flex-1 overflow-y-auto py-4 scrollbar-subtle'>{buildOptionsContent}</div>
              </section>
            ) : renderNavigation?.({ view: popupView, onClose: closePopup })}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Dock className='items-end pb-2'>
        {data.map((item, idx) => (
          <DockItem
            key={idx}
            className={cn(
              'aspect-square rounded-full bg-gray-200 dark:bg-neutral-800',
              popupView === item.action && 'ring-1 ring-white/25'
            )}
            onClick={() => runAction(item)}
            active={popupView === item.action}
            ariaLabel={item.title}
            hasPopup={
              item.action === 'projects' ||
              item.action === 'chats' ||
              item.action === 'usage' ||
              item.action === 'build-options'
            }
          >
            <DockLabel>{item.title}</DockLabel>
            <DockIcon>{item.icon}</DockIcon>
          </DockItem>
        ))}
      </Dock>
    </div>
  );
}
