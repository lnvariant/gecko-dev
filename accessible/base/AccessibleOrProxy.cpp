/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AccessibleOrProxy.h"
#include "mozilla/a11y/DocAccessibleParent.h"
#include "mozilla/a11y/OuterDocAccessible.h"
#include "mozilla/StaticPrefs_accessibility.h"

namespace mozilla {
namespace a11y {

AccessibleOrProxy AccessibleOrProxy::Parent() const {
  if (IsAccessible()) {
    return AsAccessible()->Parent();
  }

  ProxyAccessible* proxy = AsProxy();
  if (!proxy) {
    return nullptr;
  }

  if (ProxyAccessible* parent = proxy->Parent()) {
    return parent;
  }

  // Otherwise this should be the proxy for the tab's top level document.
  return proxy->OuterDocOfRemoteBrowser();
}

ProxyAccessible* AccessibleOrProxy::RemoteChildDoc() const {
  // This pref should be removed once the Dev Tools A11y Panel Fission
  // groundwork has landed and it has been verified that this doesn't cause
  // problems.
  if (!StaticPrefs::accessibility_xpcom_traverse_outerdoc() || IsProxy()) {
    return nullptr;
  }
  OuterDocAccessible* outerDoc = AsAccessible()->AsOuterDoc();
  if (!outerDoc) {
    return nullptr;
  }
  return outerDoc->RemoteChildDoc();
}

}  // namespace a11y
}  // namespace mozilla
